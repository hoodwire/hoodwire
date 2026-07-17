import type { Capability, Quote } from "@hoodwire/sdk";
import { formatUnits, type Hex } from "viem";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";
import { priceClient, pricesAreRemote } from "../chain-client.js";
import { ROBINHOOD_MAINNET_FEEDS } from "../feeds/robinhood-mainnet.js";

/** Illustrative marks, used only when no onchain feed is configured. */
const MARKS: Record<string, number> = {
  tNVDA: 1287.4, tAAPL: 243.1, tGOOGL: 201.8, tMSFT: 512.6, tSPY: 634.2,
  tTSLA: 421.7, tMETA: 618.3, tAMZN: 231.5, tCOIN: 288.9, tPLTR: 172.4,
};

const aggregatorAbi = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

/**
 * Symbol → Chainlink aggregator proxy.
 *
 * The committed map holds the official Robinhood Chain **mainnet** proxies, which is where
 * Chainlink publishes these feeds — so they are only used once CHAINLINK_RPC_URL points the
 * price client at mainnet. CHAINLINK_FEEDS (JSON, e.g. {"tNVDA":"0x…"}) overrides the map
 * for any other deployment.
 */
function feeds(): Record<string, Hex> {
  if (process.env.CHAINLINK_FEEDS) {
    try {
      return JSON.parse(process.env.CHAINLINK_FEEDS) as Record<string, Hex>;
    } catch {
      return {};
    }
  }
  return pricesAreRemote ? ROBINHOOD_MAINNET_FEEDS : {};
}

/** Reject a price older than the feed's heartbeat — a stale feed is not a price. */
const MAX_STALENESS_SEC = Number(process.env.CHAINLINK_MAX_STALENESS_SEC ?? 3600);

/**
 * Robinhood Chain is an L2, so a price is only trustworthy while the sequencer is up.
 * Set CHAINLINK_SEQUENCER_FEED to the uptime feed to enable the check.
 */
const SEQUENCER_FEED = process.env.CHAINLINK_SEQUENCER_FEED as Hex | undefined;
const SEQUENCER_GRACE_SEC = 3600;

async function sequencerDown(): Promise<string | null> {
  if (!SEQUENCER_FEED) return null;
  const round = await priceClient.readContract({
    address: SEQUENCER_FEED,
    abi: aggregatorAbi,
    functionName: "latestRoundData",
  });
  // answer: 0 = sequencer up, 1 = down.
  if (round[1] !== 0n) return "sequencer is down";
  const since = Math.floor(Date.now() / 1000) - Number(round[2]);
  if (since <= SEQUENCER_GRACE_SEC) return "sequencer grace period has not elapsed";
  return null;
}

/**
 * Chainlink Data Feeds adapter.
 *
 * With CHAINLINK_FEEDS configured, prices are read onchain and validated (sequencer up,
 * answer positive, round fresh). A configured feed never falls back to a simulated mark:
 * a caller paying for a Chainlink price must get one or an error, never a made-up number
 * wearing a real label. The simulated path exists only when no feed is configured at all.
 */
export const chainlink: VendorAdapter = {
  id: "chainlink-feeds",
  name: "Chainlink Data Feeds",
  capabilities: ["get_stock_price"],

  async quote(capability: Capability): Promise<Quote> {
    return { vendorId: this.id, capability, priceUsdg: 0.002, estLatencyMs: jitter(96) };
  },

  async execute(_capability, params): Promise<ExecutionResult> {
    const symbol = String(params.symbol ?? "tNVDA");
    const feed = feeds()[symbol];

    if (feed) return readFeed(symbol, feed);

    const latency = jitter(96);
    await sleep(Math.min(latency, 40));
    const base = MARKS[symbol] ?? 100;
    return {
      ok: true,
      data: {
        vendor: chainlink.id,
        symbol,
        priceUsdg: Number((base * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2)),
        source: "simulated (set CHAINLINK_FEEDS for live prices)",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() {
    return true;
  },
};

/** Read and validate one feed. Any failure is reported as a failure, never papered over. */
async function readFeed(symbol: string, feed: Hex): Promise<ExecutionResult> {
  const started = performance.now();
  const fail = (error: string): ExecutionResult => ({
    ok: false,
    data: { vendor: chainlink.id, symbol, feed, error, source: "chainlink-onchain" },
    actualLatencyMs: Math.round(performance.now() - started),
  });

  try {
    const down = await sequencerDown();
    if (down) return fail(down);

    const [decimals, round] = await Promise.all([
      priceClient.readContract({ address: feed, abi: aggregatorAbi, functionName: "decimals" }),
      priceClient.readContract({ address: feed, abi: aggregatorAbi, functionName: "latestRoundData" }),
    ]);

    const [roundId, answer, , updatedAt] = round;
    if (answer <= 0n) return fail("feed returned a non-positive answer");
    if (updatedAt === 0n) return fail("round is not complete");

    const ageSec = Math.floor(Date.now() / 1000) - Number(updatedAt);
    if (ageSec > MAX_STALENESS_SEC) {
      return fail(`price is stale (${ageSec}s old, max ${MAX_STALENESS_SEC}s)`);
    }

    return {
      ok: true,
      data: {
        vendor: chainlink.id,
        symbol,
        priceUsdg: Number(formatUnits(answer, decimals)),
        roundId: roundId.toString(),
        updatedAt: Number(updatedAt),
        ageSec,
        feed,
        // Say so when the price is read from a different chain than the one it settles on.
        source: pricesAreRemote ? "chainlink-onchain (price chain)" : "chainlink-onchain",
      },
      actualLatencyMs: Math.round(performance.now() - started),
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message.split("\n")[0] : "feed read failed");
  }
}
