import { pickWinner, type Capability, type RouteResult } from "@hoodwire/sdk";
import { ADAPTERS } from "./adapters/index.js";
import { reputationOf } from "./reputation.js";

/** Run the auction: quote every capable vendor in parallel, score, pick the winner. */
export async function route(
  capability: Capability,
  params: Record<string, unknown>,
): Promise<RouteResult & { adapterId: string }> {
  const t0 = performance.now();
  const capable = ADAPTERS.filter((a) => a.capabilities.includes(capability));
  if (capable.length === 0) throw new Error(`no vendor registered for ${capability}`);

  const quotes = await Promise.all(capable.map((a) => a.quote(capability, params)));
  const { winner, score, losers } = pickWinner(quotes, reputationOf);
  return {
    winner, losers, score,
    routedInMs: Math.round(performance.now() - t0),
    adapterId: winner.vendorId,
  };
}
