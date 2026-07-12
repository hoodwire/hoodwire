"use client";

import { useEffect, useRef, useState } from "react";
import { PageShell, Card, C, mono } from "@/components/site-chrome";
import { DEFAULT_BUDGET, type BudgetConfig } from "@hoodwire/sdk";

/* Simulated agent activity — replace with a WebSocket feed from the gateway. */
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

interface Entry { id: number; time: string; cap: string; vendor: string; fee: number; ms: number; }

function SliderRow({ label, value, min, max, step, onChange, hint }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; hint: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-4" style={{ borderTop: `1px solid ${C.line}` }}>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs uppercase tracking-widest" style={{ color: C.mute }}>{label}</span>
        <span className="text-lg font-semibold tabular-nums" style={{ color: C.lime }}>{value.toFixed(2)} USDG</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full appearance-none h-1 rounded-full cursor-pointer"
        style={{ background: `linear-gradient(90deg, rgba(198,245,62,0.75) ${pct}%, rgba(138,148,132,0.25) ${pct}%)`, accentColor: C.lime }}
      />
      <p className="text-xs mt-2" style={{ color: C.mute }}>{hint}</p>
    </div>
  );
}

export default function Dashboard() {
  const [balance, setBalance] = useState(48.62);
  const [spentToday, setSpentToday] = useState(3.41);
  const [budget, setBudget] = useState<BudgetConfig>({ ...DEFAULT_BUDGET });
  const [running, setRunning] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [amount, setAmount] = useState("25");
  const seq = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const f = FEED[seq.current % FEED.length];
      seq.current += 1;
      setBalance((b) => Number((b - f.fee).toFixed(3)));
      setSpentToday((s) => Number((s + f.fee).toFixed(3)));
      setEntries((prev) => [{
        id: seq.current,
        time: new Date().toLocaleTimeString("en-GB"),
        ...f,
      }, ...prev].slice(0, 8));
    }, 2600);
    return () => clearInterval(id);
  }, [running]);

  const dailyPct = budget.dailyLimitUsdg > 0 ? Math.min(100, (spentToday / budget.dailyLimitUsdg) * 100) : 0;
  const halted = budget.dailyLimitUsdg > 0 && spentToday >= budget.dailyLimitUsdg;
  const lowBalance = balance <= budget.lowBalanceAlertUsdg;

  const move = (dir: 1 | -1) => {
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) return;
    setBalance((b) => Number(Math.max(0, b + dir * v).toFixed(2)));
  };

  return (
    <PageShell eyebrow="App · demo mode" title={<>Your agent&apos;s <span style={{ color: C.lime }}>deposit wallet.</span></>}>
      {(halted || lowBalance) && (
        <div className="mb-6 rounded-xl px-5 py-3 text-sm" style={{ border: `1px solid ${C.limeBorder}`, background: C.limeDim, color: C.ink }}>
          {halted
            ? `⛔ Daily limit reached (${budget.dailyLimitUsdg} USDG) — agent halted until UTC midnight.`
            : `⚠ Low balance: ${balance.toFixed(2)} USDG ≤ alert at ${budget.lowBalanceAlertUsdg} USDG. Agent keeps running.`}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* wallet */}
        <Card>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: C.mute }}>Balance</div>
          <div className="text-4xl font-bold tabular-nums" style={{ color: C.lime }}>{balance.toFixed(2)} <span className="text-lg">USDG</span></div>
          <div className="text-xs mt-1" style={{ color: C.mute }}>wallet 0x9f…a21e · Robinhood Chain</div>

          <div className="mt-6 flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-24 px-3 py-2 rounded-lg text-sm outline-none tabular-nums"
              style={{ ...mono, background: "rgba(11,14,12,0.6)", border: `1px solid ${C.line}`, color: C.ink }}
            />
            <button onClick={() => move(1)} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: C.lime, color: C.bg }}>Top up</button>
            <button onClick={() => move(-1)} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold" style={{ border: `1px solid ${C.line}`, color: C.ink }}>Withdraw</button>
          </div>
          <p className="text-xs mt-3" style={{ color: C.mute }}>Withdraw anytime, no lock-up. Demo mode — no real funds.</p>

          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: C.mute }}>Spent today</span>
              <span className="tabular-nums" style={{ color: C.ink }}>
                {spentToday.toFixed(2)} / {budget.dailyLimitUsdg > 0 ? budget.dailyLimitUsdg.toFixed(0) : "∞"} USDG
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(138,148,132,0.15)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dailyPct}%`, background: halted ? "#e0704a" : C.lime }} />
            </div>
          </div>
        </Card>

        {/* budget controls */}
        <Card>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.lime }}>Budget controls</div>
          <SliderRow
            label="Daily spend limit" value={budget.dailyLimitUsdg} min={0} max={200} step={1}
            onChange={(v) => setBudget((b) => ({ ...b, dailyLimitUsdg: v }))}
            hint={budget.dailyLimitUsdg === 0 ? "0 = unlimited" : "Agent halts at the cap. Resets UTC midnight."}
          />
          <SliderRow
            label="Approval threshold" value={budget.approvalThresholdUsdg} min={0} max={10} step={0.05}
            onChange={(v) => setBudget((b) => ({ ...b, approvalThresholdUsdg: v }))}
            hint={budget.approvalThresholdUsdg === 0 ? "0 = full autopilot" : "Calls above this pause for your approval."}
          />
          <SliderRow
            label="Low balance alert" value={budget.lowBalanceAlertUsdg} min={0} max={50} step={0.5}
            onChange={(v) => setBudget((b) => ({ ...b, lowBalanceAlertUsdg: v }))}
            hint="You get notified; the agent keeps running."
          />
        </Card>

        {/* activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs uppercase tracking-widest" style={{ color: C.lime }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: running && !halted ? C.lime : C.mute }} />
              Agent activity
            </div>
            <button
              onClick={() => setRunning((r) => !r)}
              className="text-xs px-3 py-1 rounded-full"
              style={{ border: `1px solid ${C.line}`, color: C.mute }}
            >
              {running ? "pause" : "resume"}
            </button>
          </div>
          <div className="space-y-2 text-xs" style={mono}>
            {entries.length === 0 && <div style={{ color: C.mute }}>waiting for calls…</div>}
            {entries.map((e) => (
              <div key={e.id} className="flex justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.ink }}>{e.cap}</span>
                <span style={{ color: C.mute }}>{e.vendor}</span>
                <span className="tabular-nums" style={{ color: C.lime }}>{e.fee} USDG · {e.ms}ms ✓</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
