"use client";

import { useEffect, useRef, useState } from "react";
import { Card, C, mono } from "@/components/site-chrome";
import { useEventStream } from "./use-event-stream";

/* Simulated fallback when the gateway SSE feed isn't connected. */
const FEED = [
  { cap: "get_stock_price", vendor: "chainlink-feeds", fee: 0.002, ms: 96 },
  { cap: "execute_swap", vendor: "uniswap-v3", fee: 0.14, ms: 612 },
  { cap: "portfolio_snapshot", vendor: "hoodwire-core", fee: 0.005, ms: 214 },
  { cap: "get_lending_rate", vendor: "morpho-blue", fee: 0.02, ms: 236 },
  { cap: "execute_swap", vendor: "pleiades", fee: 0.11, ms: 596 },
  { cap: "get_stock_price", vendor: "chainlink-feeds", fee: 0.002, ms: 91 },
  { cap: "supply_collateral", vendor: "morpho-blue", fee: 0.08, ms: 784 },
  { cap: "bridge_quote", vendor: "hoodwire-core", fee: 0.01, ms: 342 },
];

interface Row { id: number | string; cap: string; vendor: string; fee: number; ms: number; }

export function ActivityCard({ onSpend }: { onSpend?: (fee: number) => void }) {
  const { events, connected } = useEventStream(8);
  const live = connected && events.length > 0;

  const [running, setRunning] = useState(true);
  const [sim, setSim] = useState<Row[]>([]);
  const seq = useRef(0);

  // Run the simulator only while the live feed is unavailable.
  useEffect(() => {
    if (live || !running) return;
    const id = setInterval(() => {
      const f = FEED[seq.current % FEED.length];
      seq.current += 1;
      onSpend?.(f.fee);
      setSim((prev) => [{ id: `s${seq.current}`, ...f }, ...prev].slice(0, 8));
    }, 2600);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, running]);

  const rows: Row[] = live
    ? events.map((e) => ({ id: e.id, cap: e.capability, vendor: e.vendor, fee: e.feeUsdg, ms: e.routingMs + e.executionMs }))
    : sim;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-widest" style={{ color: C.lime }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: live || running ? C.lime : C.mute }} />
          Agent activity
          <span className="ml-2 lowercase tracking-normal" style={{ color: live ? C.lime : C.mute }}>· {live ? "live" : "simulated"}</span>
        </div>
        {!live && (
          <button
            onClick={() => setRunning((r) => !r)}
            className="text-xs px-3 py-1 rounded-full"
            style={{ border: `1px solid ${C.line}`, color: C.mute }}
          >
            {running ? "pause" : "resume"}
          </button>
        )}
      </div>
      <div className="space-y-2 text-xs" style={mono}>
        {rows.length === 0 && <div style={{ color: C.mute }}>waiting for calls…</div>}
        {rows.map((e) => (
          <div key={e.id} className="flex justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
            <span style={{ color: C.ink }}>{e.cap}</span>
            <span style={{ color: C.mute }}>{e.vendor}</span>
            <span className="tabular-nums" style={{ color: C.lime }}>{e.fee} USDG · {e.ms}ms ✓</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
