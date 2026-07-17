/** Hoodwire shared types + routing math. Single source of truth for web & gateway. */

export type Capability =
  | "get_stock_price"
  | "execute_swap"
  | "get_lending_rate"
  | "supply_collateral"
  | "portfolio_snapshot"
  | "bridge_quote";

export type VendorType = "AMM" | "Oracle" | "Lending" | "Bridge" | "Indexer";

export interface VendorInfo {
  id: string;
  name: string;
  type: VendorType;
  capabilities: Capability[];
  /** onchain reputation score 0–100 */
  reputation: number;
  p50LatencyMs: number;
}

export interface Quote {
  vendorId: string;
  capability: Capability;
  /** fee in USDG for this call */
  priceUsdg: number;
  /** vendor-estimated execution latency */
  estLatencyMs: number;
}

export interface RouteResult {
  winner: Quote;
  losers: Quote[];
  /** total score of the winner (lower = better) */
  score: number;
  routedInMs: number;
}

export interface ScoreWeights {
  price: number;
  latency: number;
  reputation: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  price: 0.5,
  latency: 0.3,
  reputation: 0.2,
};

/**
 * Lower is better. Normalizes each dimension against the quote set so weights
 * are comparable across capabilities with very different fee magnitudes.
 */
export function scoreQuote(
  q: Quote,
  all: Quote[],
  reputationOf: (vendorId: string) => number,
  w: ScoreWeights = DEFAULT_WEIGHTS,
): number {
  const maxPrice = Math.max(...all.map((x) => x.priceUsdg), 1e-9);
  const maxLat = Math.max(...all.map((x) => x.estLatencyMs), 1);
  const price = q.priceUsdg / maxPrice;
  const latency = q.estLatencyMs / maxLat;
  const rep = 1 - reputationOf(q.vendorId) / 100; // 0 = perfect reputation
  return w.price * price + w.latency * latency + w.reputation * rep;
}

export function pickWinner(
  quotes: Quote[],
  reputationOf: (vendorId: string) => number,
  w?: ScoreWeights,
): { winner: Quote; score: number; losers: Quote[] } {
  if (quotes.length === 0) throw new Error("no quotes to route");
  let best = quotes[0];
  let bestScore = scoreQuote(best, quotes, reputationOf, w);
  for (const q of quotes.slice(1)) {
    const s = scoreQuote(q, quotes, reputationOf, w);
    if (s < bestScore) { best = q; bestScore = s; }
  }
  return { winner: best, score: bestScore, losers: quotes.filter((q) => q !== best) };
}

/** Budget controls enforced by the gateway (mirrors SettlementEscrow.UserConfig). */
export interface BudgetConfig {
  dailyLimitUsdg: number;      // 0 = unlimited
  approvalThresholdUsdg: number; // 0 = full autopilot
  lowBalanceAlertUsdg: number;
}

export const DEFAULT_BUDGET: BudgetConfig = {
  dailyLimitUsdg: 25,
  approvalThresholdUsdg: 0.5,
  lowBalanceAlertUsdg: 5,
};

/**
 * The exact message a wallet signs to be issued an agent key. Shared so the dashboard
 * signs byte-for-byte what the gateway verifies — any drift here breaks issuance.
 */
export function agentKeyMessage(address: string, issuedAt: number): string {
  return [
    "Hoodwire — create an agent key",
    "",
    "This key lets an agent spend from this wallet's escrow,",
    "capped by your onchain daily limit. It costs no gas.",
    "",
    `address: ${address.toLowerCase()}`,
    `issued: ${new Date(issuedAt).toISOString()}`,
  ].join("\n");
}
