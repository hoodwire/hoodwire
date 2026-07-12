import type { Capability, Quote } from "@hoodwire/sdk";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";

/** Plausible 24/7 Stock Token marks for the demo. */
const MARKS: Record<string, number> = {
  tNVDA: 1287.4, tAAPL: 243.1, tGOOGL: 201.8, tMSFT: 512.6, tSPY: 634.2,
};

/**
 * Chainlink Data Feeds adapter.
 * TODO(onchain): read AggregatorV3Interface.latestRoundData() per feed via viem.
 */
export const chainlink: VendorAdapter = {
  id: "chainlink-feeds",
  name: "Chainlink Data Feeds",
  capabilities: ["get_stock_price"],

  async quote(capability: Capability): Promise<Quote> {
    return { vendorId: this.id, capability, priceUsdg: 0.002, estLatencyMs: jitter(96) };
  },

  async execute(_capability, params): Promise<ExecutionResult> {
    const latency = jitter(96);
    await sleep(Math.min(latency, 40));
    const symbol = String(params.symbol ?? "tNVDA");
    const base = MARKS[symbol] ?? 100;
    return {
      ok: true,
      data: {
        vendor: this.id,
        symbol,
        priceUsdg: Number((base * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2)),
        roundId: 118_442_031,
        note: "SIMULATED — see TODO(onchain) in adapters/chainlink.ts",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() { return true; },
};
