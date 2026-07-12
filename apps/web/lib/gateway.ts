/** Base URL of the gateway HTTP/SSE sidecar. Unset in production → falls back to demo data. */
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8787";

export interface SettledCall {
  id: number;
  ts: number;
  capability: string;
  vendor: string;
  feeUsdg: number;
  routingMs: number;
  executionMs: number;
  ok: boolean;
  losingBids: string[];
}

export interface RollingMetrics {
  hasData: boolean;
  totals: { calls: number; p50: number; savingPct: number; activeVendors: number };
  series: { hour: string; calls: number; p50: number }[];
  vendorShare: [string, number][];
}
