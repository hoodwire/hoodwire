import type { Capability, Quote } from "@hoodwire/sdk";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";

/**
 * Uniswap v3 adapter (Robinhood Chain deployment).
 * TODO(onchain): replace mock quote with QuoterV2.quoteExactInputSingle via viem,
 * and execute via SwapRouter02 with the operator wallet.
 */
export const uniswap: VendorAdapter = {
  id: "uniswap-v3",
  name: "Uniswap v3",
  capabilities: ["execute_swap"],

  async quote(capability: Capability, params): Promise<Quote> {
    const notional = Number(params.amountUsdg ?? 100);
    return {
      vendorId: this.id,
      capability,
      // fee model: 12–16 bps of routing fee expressed as flat USDG per call
      priceUsdg: Math.max(0.05, Math.min(0.16, notional * 0.00006)),
      estLatencyMs: jitter(380),
    };
  },

  async execute(_capability, params): Promise<ExecutionResult> {
    const latency = jitter(560);
    await sleep(Math.min(latency, 50)); // keep dev loop snappy
    return {
      ok: true,
      data: {
        vendor: this.id,
        pool: `${params.tokenIn ?? "USDG"}/${params.tokenOut ?? "tNVDA"} 0.05%`,
        txHash: `0x${"ab12".repeat(16)}`,
        note: "SIMULATED — see TODO(onchain) in adapters/uniswap.ts",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() { return true; },
};
