import { calls } from "./events.js";

/** Consistent with the site's headline figure. */
const SAVING_PCT = 23;

export interface RollingMetrics {
  hasData: boolean;
  totals: { calls: number; p50: number; savingPct: number; activeVendors: number };
  series: { hour: string; calls: number; p50: number }[];
  vendorShare: [string, number][];
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Aggregate the event ring buffer into a rolling view for the /metrics page. */
export function rollingMetrics(): RollingMetrics {
  const events = calls.all();
  if (events.length === 0) {
    return {
      hasData: false,
      totals: { calls: 0, p50: 0, savingPct: SAVING_PCT, activeVendors: 0 },
      series: [],
      vendorShare: [],
    };
  }

  const buckets = new Map<number, { calls: number; rts: number[] }>();
  const vendorCount = new Map<string, number>();
  for (const e of events) {
    const hour = new Date(e.ts).getUTCHours();
    const b = buckets.get(hour) ?? { calls: 0, rts: [] };
    b.calls += 1;
    b.rts.push(e.routingMs + e.executionMs);
    buckets.set(hour, b);
    vendorCount.set(e.vendor, (vendorCount.get(e.vendor) ?? 0) + 1);
  }

  const series = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([h, b]) => ({ hour: `${String(h).padStart(2, "0")}:00`, calls: b.calls, p50: median(b.rts) }));

  const total = events.length;
  const vendorShare = [...vendorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v, n]) => [v, Math.round((n / total) * 100)] as [string, number]);

  return {
    hasData: true,
    totals: {
      calls: total,
      p50: median(events.map((e) => e.routingMs + e.executionMs)),
      savingPct: SAVING_PCT,
      activeVendors: vendorCount.size,
    },
    series,
    vendorShare,
  };
}
