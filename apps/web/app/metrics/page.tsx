"use client";

import { PageShell, Card, C, mono } from "@/components/site-chrome";
import { HOURLY_METRICS, VENDORS } from "@/lib/vendors";
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

export default function Metrics() {
  const totalCalls = HOURLY_METRICS.reduce((s, h) => s + h.calls, 0);
  return (
    <PageShell eyebrow="Network metrics" title={<>The network, <span style={{ color: C.lime }}>live.</span></>}>
      {/* headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { v: totalCalls.toLocaleString("en-US"), l: "Calls · last 24h" },
          { v: "782ms", l: "Round-trip p50" },
          { v: "23%", l: "Avg. saving vs naive routing" },
          { v: `${VENDORS.length}`, l: "Active vendors" },
        ].map((s) => (
          <Card key={s.l}>
            <div className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: C.lime }}>{s.v}</div>
            <div className="text-xs mt-1 uppercase tracking-wide" style={{ color: C.mute }}>{s.l}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="text-sm font-semibold mb-1">Routed calls / hour</div>
          <div className="text-xs mb-4" style={{ color: C.mute }}>UTC · simulated feed — wire to gateway events</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_METRICS}>
                <defs>
                  <linearGradient id="lime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.lime} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.lime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="hour" stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} interval={3} />
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
              <LineChart data={HOURLY_METRICS}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="hour" stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} interval={3} />
                <YAxis stroke={C.mute} fontSize={11} tickLine={false} axisLine={false} width={44} domain={[650, 900]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="p50" stroke={C.lime} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* per-vendor share */}
      <Card className="mt-6">
        <div className="text-sm font-semibold mb-4">Vendor win share · last 24h</div>
        <div className="space-y-3">
          {[
            ["uniswap-v3", 34], ["chainlink-feeds", 28], ["hoodwire-core", 17],
            ["pleiades", 13], ["morpho-blue", 8],
          ].map(([id, pct]) => (
            <div key={id as string} className="flex items-center gap-4 text-sm">
              <span className="w-40 shrink-0" style={{ ...mono, color: C.ink }}>{id}</span>
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
