/**
 * Base URL of the gateway HTTP/SSE sidecar, or null when not configured.
 * On the public site this is null so we never probe localhost / a private network
 * (which triggers Chrome's "access other apps on this device" prompt). For local dev,
 * set NEXT_PUBLIC_GATEWAY_URL=http://127.0.0.1:8787 in apps/web/.env.local.
 */
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? null;

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
