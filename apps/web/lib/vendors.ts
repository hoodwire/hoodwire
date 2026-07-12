import type { Capability, VendorInfo } from "@hoodwire/sdk";

export const VENDORS: VendorInfo[] = [
  { id: "uniswap-v3", name: "Uniswap v3", type: "AMM", capabilities: ["execute_swap"], reputation: 98.4, p50LatencyMs: 340 },
  { id: "pleiades", name: "Pleiades", type: "AMM", capabilities: ["execute_swap"], reputation: 97.1, p50LatencyMs: 362 },
  { id: "chainlink-feeds", name: "Chainlink Data Feeds", type: "Oracle", capabilities: ["get_stock_price"], reputation: 99.2, p50LatencyMs: 88 },
  { id: "morpho-blue", name: "Morpho Blue", type: "Lending", capabilities: ["get_lending_rate", "supply_collateral"], reputation: 96.8, p50LatencyMs: 610 },
  { id: "hoodwire-core", name: "Hoodwire Core", type: "Indexer", capabilities: ["portfolio_snapshot", "bridge_quote"], reputation: 99.0, p50LatencyMs: 130 },
];

export const FEE_RANGES: Record<string, string> = {
  "uniswap-v3": "0.12–0.16 USDG",
  pleiades: "0.10–0.17 USDG",
  "chainlink-feeds": "0.002 USDG",
  "morpho-blue": "0.06–0.09 USDG",
  "hoodwire-core": "0.005–0.01 USDG",
};

export const CAPABILITIES: { name: Capability; desc: string; fee: string; p50: string }[] = [
  { name: "get_stock_price", desc: "Real-time Stock Token prices (tNVDA, tAAPL, tGOOGL…) via Chainlink feeds.", fee: "0.002 USDG", p50: "96ms" },
  { name: "execute_swap", desc: "Swap on the best AMM — Uniswap v3 vs Pleiades, auctioned per request.", fee: "0.10–0.17 USDG", p50: "612ms" },
  { name: "get_lending_rate", desc: "Supply/borrow APY for any lending market on the chain.", fee: "0.02 USDG", p50: "236ms" },
  { name: "supply_collateral", desc: "Supply USDG or Stock Tokens as collateral, routed to the best market.", fee: "0.06–0.09 USDG", p50: "784ms" },
  { name: "portfolio_snapshot", desc: "Positions, balances, and marks for the connected wallet.", fee: "0.005 USDG", p50: "214ms" },
  { name: "bridge_quote", desc: "Bridge USDG between Robinhood Chain and Ethereum L1.", fee: "0.01 USDG", p50: "342ms" },
];

/** 24 hours of plausible network metrics for the /metrics page. */
export const HOURLY_METRICS = Array.from({ length: 24 }, (_, h) => {
  const wave = Math.sin((h / 24) * Math.PI * 2 - 1.2);
  return {
    hour: `${String(h).padStart(2, "0")}:00`,
    calls: Math.round(4200 + wave * 1500 + (h % 3) * 140),
    p50: Math.round(782 + wave * 60 + (h % 5) * 8),
    savingPct: Number((23 + wave * 2.4).toFixed(1)),
  };
});
