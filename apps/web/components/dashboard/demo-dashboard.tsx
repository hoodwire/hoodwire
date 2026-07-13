"use client";

import { useState } from "react";
import { Card, C, mono } from "@/components/site-chrome";
import { DEFAULT_BUDGET, type BudgetConfig } from "@hoodwire/sdk";
import { SliderRow } from "./slider-row";
import { ActivityCard } from "./activity-card";

/** Fallback shown when no wallet is connected to the local chain. All values simulated. */
export function DemoDashboard() {
  const [balance, setBalance] = useState(48.62);
  const [spentToday, setSpentToday] = useState(3.41);
  const [budget, setBudget] = useState<BudgetConfig>({ ...DEFAULT_BUDGET });
  const [amount, setAmount] = useState("25");

  const dailyPct = budget.dailyLimitUsdg > 0 ? Math.min(100, (spentToday / budget.dailyLimitUsdg) * 100) : 0;
  const halted = budget.dailyLimitUsdg > 0 && spentToday >= budget.dailyLimitUsdg;

  const move = (dir: 1 | -1) => {
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) return;
    setBalance((b) => Number(Math.max(0, b + dir * v).toFixed(2)));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card>
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: C.mute }}>Balance</div>
        <div className="text-4xl font-bold tabular-nums" style={{ color: C.lime }}>{balance.toFixed(2)} <span className="text-lg">USDG</span></div>
        <div className="text-xs mt-1" style={{ color: C.mute }}>demo wallet · not connected</div>

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
        <p className="text-xs mt-3" style={{ color: C.mute }}>Demo mode — no real funds. Connect a wallet on Robinhood Chain Testnet for live balances.</p>

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

      <ActivityCard onSpend={(fee) => {
        setBalance((b) => Number((b - fee).toFixed(3)));
        setSpentToday((s) => Number((s + fee).toFixed(3)));
      }} />
    </div>
  );
}
