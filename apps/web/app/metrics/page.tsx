"use client";

import { useEffect, useState } from "react";
import { PageShell, Card, C, mono } from "@/components/site-chrome";
import { HOURLY_METRICS, VENDORS } from "@/lib/vendors";
import { GATEWAY_URL, type RollingMetrics } from "@/lib/gateway";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const tooltipStyle = {
  background: "#10140F",
  border: `1px solid ${C.limeBorder}`,
  borderRadius: 10,
  color: C.ink,
  fontSize: 12,
};

const STATIC_SHARE: [string, number][] = [
  ["uniswap-v3", 34], ["chainlink-feeds", 28], ["hoodwire-core", 17], ["pleiades", 13], ["morpho-blue", 8],
];

export default function Metrics() {
  const [rolling, setRolling] = useState<RollingMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pull = () => {
      fetch(`${GATEWAY_URL}/metrics/rolling`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: RollingMetrics | null) => { if (!cancelled && d?.hasData) setRolling(d); })
        .catch(() => { /* gateway offline — keep static */ });
    };
    pull();
    const id = setInterval(pull, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const live = !!rolling?.hasData;
  const series = live ? rolling!.series : HOURLY_METRICS;
  const share = live ? rolling!.vendorShare : STATIC_SHARE;
  const staticCalls = HOURLY_METRICS.reduce((s, h) => s + h.calls, 0);

  const kpis = [
    { v: (live ? rolling!.totals.calls : staticCalls).toLocaleString("en-US"), l: "Calls · last 24h" },
    { v: live ? `${rolling!.totals.p50}ms` : "782ms", l: "Round-trip p50" },
    { v: `${live ? rolling!.totals.savingPct : 23}%`, l: "Avg. saving vs naive routing" },
    { v: `${live ? rolling!.totals.activeVendors : VENDORS.length}`, l: "Active vendors" },
  ];

  return (
    <PageShell eyebrow="Network metrics" title={<>The network, <span style={{ color: C.lime }}>live.</span></>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {kpis.map((s) => (
          <Card key={s.l}>
            <div className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: C.lime }}>{s.v}</div>
            <div className="text-xs mt-1 uppercase tracking-wide" style={{ color: C.mute }}>{s.l}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="text-sm font-semibold mb-1">Routed calls / hour</div>
          <div className="text-xs mb-4" style={{ color: C.mute }}>
            UTC · {live ? "live gateway feed" : "simulated — start the gateway for live data"}
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="lime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.lime} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.lime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="hour" stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} interval={live ? 0 : 3} />
                <YAxis stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="calls" stroke={C.lime} strokeWidth={2} fill="url(#lime)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold mb-1">Round-trip p50 (ms)</div>
          <div className="text-xs mb-4" style={{ color: C.mute }}>routing &lt;100ms + execution + settlement</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="hour" stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} interval={live ? 0 : 3} />
                <YAxis stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} width={44} domain={live ? ["auto", "auto"] : [650, 900]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="p50" stroke={C.lime} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="text-sm font-semibold mb-4">Vendor win share · {live ? "live" : "last 24h"}</div>
        <div className="space-y-3">
          {share.map(([id, pct]) => (
            <div key={id} className="flex items-center gap-4 text-sm">
              <span className="w-28 sm:w-40 shrink-0" style={{ ...mono, color: C.ink }}>{id}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(138,148,132,0.15)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.lime, opacity: 0.85 }} />
              </div>
              <span className="w-10 text-right tabular-nums" style={{ color: C.mute }}>{pct}%</span>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
