import type { Capability } from "@hoodwire/sdk";
import { route } from "./router.js";
import { ADAPTERS } from "./adapters/index.js";
import { precheck, charge } from "./billing.js";
import { getAccount } from "./billing.js";
import { recordCall } from "./reputation.js";
import { calls } from "./events.js";

export type CapabilityResult =
  | { ok: true; summary: Record<string, unknown> }
  | { ok: false; reason: string; detail: string };

/**
 * The core Hoodwire request lifecycle, shared by the MCP tools and the HTTP API:
 * precheck budget → auction across vendors → execute winner → charge (onchain when
 * configured) → record reputation → publish a settled-call event.
 */
export async function runCapability(
  capability: Capability,
  params: Record<string, unknown>,
  user = "dev-user",
): Promise<CapabilityResult> {
  const routed = await route(capability, params);

  const pre = precheck(user, routed.winner.priceUsdg);
  if (!pre.ok) return { ok: false, reason: pre.reason, detail: pre.detail };

  const adapter = ADAPTERS.find((a) => a.id === routed.adapterId)!;
  const result = await adapter.execute(capability, params);

  const settled = await charge(user, routed.winner.priceUsdg, {
    vendor: adapter.id,
    ok: result.ok,
    latencyMs: result.actualLatencyMs,
  });
  if (!settled.ok) return { ok: false, reason: settled.reason, detail: settled.detail };

  recordCall(adapter.id, result.ok, result.actualLatencyMs);

  calls.publish({
    capability,
    vendor: adapter.id,
    feeUsdg: routed.winner.priceUsdg,
    routingMs: routed.routedInMs,
    executionMs: result.actualLatencyMs,
    ok: result.ok,
    losingBids: routed.losers.map((l) => `${l.vendorId} @ ${l.priceUsdg} USDG`),
  });

  const acct = getAccount(user);
  return {
    ok: true,
    summary: {
      capability,
      routedTo: adapter.id,
      feeUsdg: routed.winner.priceUsdg,
      routingMs: routed.routedInMs,
      executionMs: result.actualLatencyMs,
      losingBids: routed.losers.map((l) => `${l.vendorId} @ ${l.priceUsdg} USDG`),
      balanceUsdg: acct.balanceUsdg,
      ...(pre.warnLowBalance ? { warning: `low balance — below ${acct.budget.lowBalanceAlertUsdg} USDG alert` } : {}),
      result: result.data,
    },
  };
}
