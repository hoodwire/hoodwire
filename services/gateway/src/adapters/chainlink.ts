import type { Capability, Quote } from "@hoodwire/sdk";
import { formatUnits, type Hex } from "viem";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";
import { publicClient } from "../chain-client.js";

/** Plausible 24/7 Stock Token marks, used when no onchain feed is configured. */
const MARKS: Record<string, number> = {
  tNVDA: 1287.4, tAAPL: 243.1, tGOOGL: 201.8, tMSFT: 512.6, tSPY: 634.2,
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
 * Symbol → Chainlink aggregator address, from the CHAINLINK_FEEDS env var (JSON):
 *   CHAINLINK_FEEDS={"tNVDA":"0x...","tAAPL":"0x..."}
 * Fill with the official addresses from https://docs.robinhood.com/chain/oracles-and-price-feeds/.
 */
function feeds(): Record<string, Hex> {
  try {
    return process.env.CHAINLINK_FEEDS ? (JSON.parse(process.env.CHAINLINK_FEEDS) as Record<string, Hex>) : {};
  } catch {
    return {};
  }
}

/** Chainlink Data Feeds adapter — reads a real onchain feed when one is configured. */
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

    // Real onchain path: read AggregatorV3Interface.latestRoundData().
    if (feed) {
      const started = performance.now();
      try {
        const [decimals, round] = await Promise.all([
          publicClient.readContract({ address: feed, abi: aggregatorAbi, functionName: "decimals" }),
          publicClient.readContract({ address: feed, abi: aggregatorAbi, functionName: "latestRoundData" }),
        ]);
        return {
          ok: true,
          data: {
            vendor: this.id,
            symbol,
            priceUsdg: Number(formatUnits(round[1], decimals)),
            roundId: round[0].toString(),
            feed,
            source: "chainlink-onchain",
          },
          actualLatencyMs: Math.round(performance.now() - started),
        };
      } catch {
        // fall through to the simulated mark on RPC/feed error
      }
    }

    const latency = jitter(96);
    await sleep(Math.min(latency, 40));
    const base = MARKS[symbol] ?? 100;
    return {
      ok: true,
      data: {
        vendor: this.id,
        symbol,
        priceUsdg: Number((base * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2)),
        roundId: 118_442_031,
        source: feed ? "simulated (feed read failed)" : "simulated (set CHAINLINK_FEEDS for live prices)",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() {
    return true;
  },
};
