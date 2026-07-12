/**
 * In-memory reputation mirror.
 * TODO(onchain): read/write the Reputation contract; this map becomes a cache.
 */
const REP = new Map<string, { calls: number; successes: number; latencyEwma: number }>([
  ["uniswap-v3",      { calls: 48210, successes: 47440, latencyEwma: 340 }],
  ["pleiades",        { calls: 31877, successes: 30950, latencyEwma: 362 }],
  ["chainlink-feeds", { calls: 152003, successes: 150790, latencyEwma: 88 }],
  ["morpho-blue",     { calls: 9032, successes: 8744, latencyEwma: 610 }],
  ["hoodwire-core",   { calls: 60411, successes: 59800, latencyEwma: 130 }],
]);

export function reputationOf(vendorId: string): number {
  const r = REP.get(vendorId);
  if (!r || r.calls === 0) return 50; // neutral prior for new vendors
  const successRate = r.successes / r.calls;               // 0..1
  const latencyScore = Math.max(0, 1 - r.latencyEwma / 2000); // 0..1
  return Number((100 * (0.8 * successRate + 0.2 * latencyScore)).toFixed(1));
}

export function recordCall(vendorId: string, ok: boolean, latencyMs: number): void {
  const r = REP.get(vendorId) ?? { calls: 0, successes: 0, latencyEwma: latencyMs };
  r.calls += 1;
  if (ok) r.successes += 1;
  r.latencyEwma = Math.round(r.latencyEwma * 0.95 + latencyMs * 0.05);
  REP.set(vendorId, r);
}

export function snapshot() {
  return [...REP.entries()].map(([id, r]) => ({ id, ...r, score: reputationOf(id) }));
}
