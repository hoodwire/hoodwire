import type { Capability, Quote } from "@hoodwire/sdk";
import { type VendorAdapter, type ExecutionResult, jitter, sleep } from "./types.js";

/** First-party adapter: portfolio reads + canonical bridge quotes. */
export const hoodwireCore: VendorAdapter = {
  id: "hoodwire-core",
  name: "Hoodwire Core",
  capabilities: ["portfolio_snapshot", "bridge_quote"],

  async quote(capability: Capability): Promise<Quote> {
    const read = capability === "portfolio_snapshot";
    return {
      vendorId: this.id, capability,
      priceUsdg: read ? 0.005 : 0.01,
      estLatencyMs: jitter(read ? 120 : 205),
    };
  },

  async execute(capability, params): Promise<ExecutionResult> {
    const latency = jitter(capability === "portfolio_snapshot" ? 120 : 205);
    await sleep(Math.min(latency, 40));
    if (capability === "portfolio_snapshot") {
      return {
        ok: true,
        data: {
          vendor: this.id,
          wallet: params.wallet ?? "0x9f…a21e",
          positions: [
            { asset: "USDG", amount: 1180.42 },
            { asset: "tNVDA", amount: 1.85, markUsdg: 1287.4 },
            { asset: "morpho-supply", amount: 5000, apy: 0.0412 },
          ],
          note: "SIMULATED — wire to an indexer",
        },
        actualLatencyMs: latency,
      };
    }
    return {
      ok: true,
      data: {
        vendor: this.id,
        route: "Robinhood Chain → Ethereum L1 (native bridge)",
        feeUsdg: 0.01, etaSeconds: 900,
        note: "SIMULATED — wire to canonical bridge",
      },
      actualLatencyMs: latency,
    };
  },

  async healthcheck() { return true; },
};
