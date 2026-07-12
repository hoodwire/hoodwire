import type { Capability, Quote } from "@hoodwire/sdk";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";

/**
 * Morpho Blue adapter — lending rates & collateral supply.
 * TODO(onchain): read market state from Morpho Blue and supply via viem.
 */
export const morpho: VendorAdapter = {
  id: "morpho-blue",
  name: "Morpho Blue",
  capabilities: ["get_lending_rate", "supply_collateral"],

  async quote(capability: Capability, params): Promise<Quote> {
    const isRead = capability === "get_lending_rate";
    const notional = Number(params.amountUsdg ?? 1000);
    return {
      vendorId: this.id,
      capability,
      priceUsdg: isRead ? 0.02 : Math.max(0.06, Math.min(0.09, notional * 0.000015)),
      estLatencyMs: jitter(isRead ? 230 : 610),
    };
  },

  async execute(capability, params): Promise<ExecutionResult> {
    const latency = jitter(capability === "get_lending_rate" ? 230 : 610);
    await sleep(Math.min(latency, 50));
    if (capability === "get_lending_rate") {
      return {
        ok: true,
        data: {
          vendor: this.id,
          market: `${params.asset ?? "USDG"} / ${params.collateral ?? "tNVDA"}`,
          supplyApy: 0.0412, borrowApy: 0.0587, utilization: 0.71,
          note: "SIMULATED — see TODO(onchain) in adapters/morpho.ts",
        },
        actualLatencyMs: latency,
      };
    }
    return {
      ok: true,
      data: {
        vendor: this.id,
        supplied: `${params.amountUsdg ?? 1000} USDG`,
        healthFactor: 2.31,
        txHash: `0x${"b10c".repeat(16)}`,
        note: "SIMULATED — see TODO(onchain) in adapters/morpho.ts",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() { return true; },
};
