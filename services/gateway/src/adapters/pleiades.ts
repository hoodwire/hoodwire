import type { Capability, Quote } from "@hoodwire/sdk";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";

/**
 * Pleiades AMM adapter — Robinhood Chain-native AMM, strong on Stock Token pairs.
 * TODO(onchain): wire to Pleiades router/quoter once ABI is published.
 */
export const pleiades: VendorAdapter = {
  id: "pleiades",
  name: "Pleiades",
  capabilities: ["execute_swap"],

  async quote(capability: Capability, params): Promise<Quote> {
    const notional = Number(params.amountUsdg ?? 100);
    const stockPair = String(params.tokenOut ?? "").startsWith("t");
    return {
      vendorId: this.id,
      capability,
      // cheaper on tokenized-stock pairs, slightly pricier elsewhere
      priceUsdg: Math.max(0.04, Math.min(0.17, notional * (stockPair ? 0.000045 : 0.00007))),
      estLatencyMs: jitter(355),
    };
  },

  async execute(_capability, params): Promise<ExecutionResult> {
    const latency = jitter(540);
    await sleep(Math.min(latency, 50));
    return {
      ok: true,
      data: {
        vendor: this.id,
        pair: `${params.tokenIn ?? "USDG"}/${params.tokenOut ?? "tAAPL"}`,
        txHash: `0x${"c0de".repeat(16)}`,
        note: "SIMULATED — see TODO(onchain) in adapters/pleiades.ts",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() { return true; },
};
