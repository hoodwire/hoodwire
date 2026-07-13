"use client";

import { useEffect, useState } from "react";
import { useReadContracts, useWriteContract, usePublicClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Card, C, mono } from "@/components/site-chrome";
import { type Deployment, USDG_DECIMALS } from "@/lib/chain";
import { escrowAbi, usdgAbi } from "@/lib/abis";
import { SliderRow } from "./slider-row";
import { ActivityCard } from "./activity-card";

function fmt(v: bigint): string {
  return Number(formatUnits(v, USDG_DECIMALS)).toFixed(2);
}
function parseAmount(s: string): bigint | null {
  try {
    const v = parseUnits((s.trim() || "0") as `${number}`, USDG_DECIMALS);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}
function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "shortMessage" in e) {
    return String((e as { shortMessage: unknown }).shortMessage);
  }
  return e instanceof Error ? e.message.split("\n")[0] : String(e);
}

export function LiveDashboard({ deployment, address }: { deployment: Deployment; address: `0x${string}` }) {
  const { data, refetch } = useReadContracts({
    contracts: [
      { address: deployment.settlementEscrow, abi: escrowAbi, functionName: "balances", args: [address] },
      { address: deployment.usdg, abi: usdgAbi, functionName: "balanceOf", args: [address] },
      { address: deployment.settlementEscrow, abi: escrowAbi, functionName: "configs", args: [address] },
    ],
    query: { refetchInterval: 5000 },
  });

  const escrowBal = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const walletBal = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const cfg = data?.[2]?.result as readonly [bigint, bigint, bigint] | undefined;
  const dailyLimit = cfg?.[0] ?? 0n;
  const spentToday = cfg?.[1] ?? 0n;

  const reload = () => void refetch();

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <WalletCard deployment={deployment} escrowBal={escrowBal} walletBal={walletBal} spentToday={spentToday} dailyLimit={dailyLimit} reload={reload} />
      <LimitCard deployment={deployment} dailyLimit={dailyLimit} reload={reload} />
      <ActivityCard />
    </div>
  );
}

function WalletCard({
  deployment, escrowBal, walletBal, spentToday, dailyLimit, reload,
}: {
  deployment: Deployment; escrowBal: bigint; walletBal: bigint; spentToday: bigint; dailyLimit: bigint; reload: () => void;
}) {
  const [amount, setAmount] = useState("25");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const dailyPct = dailyLimit > 0n ? Math.min(100, Number((spentToday * 100n) / dailyLimit)) : 0;
  const halted = dailyLimit > 0n && spentToday >= dailyLimit;

  async function topUp() {
    const value = parseAmount(amount);
    if (!value || !publicClient || busy) return;
    setBusy(true);
    try {
      setStatus("Approving USDG — confirm in wallet…");
      const approveHash = await writeContractAsync({
        address: deployment.usdg, abi: usdgAbi, functionName: "approve", args: [deployment.settlementEscrow, value],
      });
      setStatus("Waiting for approval…");
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      setStatus("Depositing — confirm in wallet…");
      const depositHash = await writeContractAsync({
        address: deployment.settlementEscrow, abi: escrowAbi, functionName: "deposit", args: [value],
      });
      setStatus("Confirming deposit…");
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      setStatus("Topped up ✓");
      reload();
    } catch (e) {
      setStatus("Failed: " + errMsg(e));
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 3200);
    }
  }

  async function withdraw() {
    const value = parseAmount(amount);
    if (!value || !publicClient || busy) return;
    setBusy(true);
    try {
      setStatus("Withdrawing — confirm in wallet…");
      const hash = await writeContractAsync({
        address: deployment.settlementEscrow, abi: escrowAbi, functionName: "withdraw", args: [value],
      });
      setStatus("Confirming withdrawal…");
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Withdrawn ✓");
      reload();
    } catch (e) {
      setStatus("Failed: " + errMsg(e));
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 3200);
    }
  }

  return (
    <Card>
      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: C.mute }}>Escrow balance</div>
      <div className="text-4xl font-bold tabular-nums" style={{ color: C.lime }}>{fmt(escrowBal)} <span className="text-lg">USDG</span></div>
      <div className="text-xs mt-1 flex flex-wrap items-center gap-x-2" style={{ color: C.mute }}>
        <span>wallet holds {fmt(walletBal)} USDG</span>
        {deployment.explorer && (
          <a href={`${deployment.explorer}/address/${deployment.settlementEscrow}`} target="_blank" rel="noreferrer" style={{ color: C.lime }}>
            · view escrow ↗
          </a>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          disabled={busy}
          className="w-24 px-3 py-2 rounded-lg text-sm outline-none tabular-nums"
          style={{ ...mono, background: "rgba(11,14,12,0.6)", border: `1px solid ${C.line}`, color: C.ink, opacity: busy ? 0.6 : 1 }}
        />
        <button onClick={topUp} disabled={busy} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: C.lime, color: C.bg, opacity: busy ? 0.6 : 1 }}>Top up</button>
        <button onClick={withdraw} disabled={busy} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold" style={{ border: `1px solid ${C.line}`, color: C.ink, opacity: busy ? 0.6 : 1 }}>Withdraw</button>
      </div>
      <p className="text-xs mt-3 min-h-4" style={{ color: status ? C.lime : C.mute }}>
        {status ?? "Top up approves USDG then deposits to escrow. Withdraw anytime — no lock-up."}
      </p>

      <div className="mt-6">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: C.mute }}>Spent today</span>
          <span className="tabular-nums" style={{ color: C.ink }}>
            {fmt(spentToday)} / {dailyLimit > 0n ? fmt(dailyLimit) : "∞"} USDG
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(138,148,132,0.15)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dailyPct}%`, background: halted ? "#e0704a" : C.lime }} />
        </div>
      </div>
    </Card>
  );
}

function LimitCard({ deployment, dailyLimit, reload }: { deployment: Deployment; dailyLimit: bigint; reload: () => void }) {
  const onchain = Number(formatUnits(dailyLimit, USDG_DECIMALS));
  const [uiLimit, setUiLimit] = useState(onchain);
  const [approval, setApproval] = useState(0.5);
  const [lowBalance, setLowBalance] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Keep the slider in sync with the chain unless the user is dragging it.
  useEffect(() => {
    if (!editing) setUiLimit(onchain);
  }, [onchain, editing]);

  async function commitLimit(v: number) {
    setEditing(false);
    if (!publicClient || Math.abs(v - onchain) < 0.5) return;
    setBusy("Updating limit — confirm in wallet…");
    try {
      const hash = await writeContractAsync({
        address: deployment.settlementEscrow, abi: escrowAbi, functionName: "setDailyLimit",
        args: [parseUnits(String(v) as `${number}`, USDG_DECIMALS)],
      });
      setBusy("Confirming…");
      await publicClient.waitForTransactionReceipt({ hash });
      setBusy("Daily limit set ✓");
      reload();
    } catch (e) {
      setBusy("Failed: " + errMsg(e));
    } finally {
      setTimeout(() => setBusy(null), 3200);
    }
  }

  return (
    <Card>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.lime }}>Budget controls</div>
      <SliderRow
        label="Daily spend limit" value={uiLimit} min={0} max={200} step={1}
        onChange={(v) => { setEditing(true); setUiLimit(v); }}
        onCommit={commitLimit}
        busy={busy}
        hint={uiLimit === 0 ? "0 = unlimited. Enforced onchain by SettlementEscrow." : "Onchain cap — the operator can't charge past it. Resets UTC midnight."}
      />
      <SliderRow
        label="Approval threshold" value={approval} min={0} max={10} step={0.05}
        onChange={setApproval}
        hint={approval === 0 ? "0 = full autopilot" : "Local preference — calls above this pause for approval."}
      />
      <SliderRow
        label="Low balance alert" value={lowBalance} min={0} max={50} step={0.5}
        onChange={setLowBalance}
        hint="Local preference — you get notified; the agent keeps running."
      />
    </Card>
  );
}
