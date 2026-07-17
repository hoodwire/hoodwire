"use client";

import { useEffect, useRef, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { formatUnits, hexToString, type Log } from "viem";
import { Card, C, mono } from "@/components/site-chrome";
import { type Deployment, USDG_DECIMALS } from "@/lib/chain";
import { escrowAbi } from "@/lib/abis";
import { useEventStream } from "./use-event-stream";

/* Simulated fallback when there's no onchain deployment and no gateway feed. */
const FEED = [
  { cap: "get_stock_price", vendor: "chainlink-feeds", fee: 0.002, ms: 96 },
  { cap: "execute_swap", vendor: "uniswap-v3", fee: 0.14, ms: 612 },
  { cap: "portfolio_snapshot", vendor: "hoodwire-core", fee: 0.005, ms: 214 },
  { cap: "get_lending_rate", vendor: "morpho-blue", fee: 0.02, ms: 236 },
  { cap: "execute_swap", vendor: "pleiades", fee: 0.11, ms: 596 },
  { cap: "supply_collateral", vendor: "morpho-blue", fee: 0.08, ms: 784 },
];

interface Row { id: string | number; cap: string; vendor: string; fee: number; ms: number; }

function decodeVendor(vendorId?: `0x${string}`): string {
  if (!vendorId) return "vendor";
  try {
    // bytes32 is right-padded with null bytes — keep only printable ASCII.
    const raw = hexToString(vendorId, { size: 32 });
    let s = "";
    for (const ch of raw) if (ch.charCodeAt(0) >= 32) s += ch;
    return s || "vendor";
  } catch {
    return "vendor";
  }
}

/** A Charged log → a feed row. */
function toRow(log: Log): Row {
  const args = (log as { args?: { vendorId?: `0x${string}`; fee?: bigint; latencyMs?: number } }).args ?? {};
  return {
    id: `${log.transactionHash}-${log.logIndex}`,
    cap: "capability call",
    vendor: decodeVendor(args.vendorId),
    fee: args.fee ? Number(formatUnits(args.fee, USDG_DECIMALS)) : 0,
    ms: args.latencyMs ?? 0,
  };
}

export function ActivityCard({ onSpend, deployment }: { onSpend?: (fee: number) => void; deployment?: Deployment }) {
  const onchainMode = !!deployment;
  const publicClient = usePublicClient();

  // Real onchain activity: SettlementEscrow.Charged events.
  const [chain, setChain] = useState<Row[]>([]);

  // watchContractEvent only reports events from the moment it subscribes, so backfill the
  // recent ones first — otherwise the feed looks empty until the next call lands.
  useEffect(() => {
    if (!onchainMode || !publicClient || !deployment) return;
    let cancelled = false;
    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const span = 50_000n; // keep the range small enough for public RPC limits
        const logs = await publicClient.getLogs({
          address: deployment.settlementEscrow,
          event: escrowAbi.find((e) => e.type === "event" && e.name === "Charged") as never,
          fromBlock: latest > span ? latest - span : 0n,
          toBlock: latest,
        });
        if (cancelled) return;
        const rows = logs.map(toRow).reverse().slice(0, 8);
        // Keep anything the live watcher already picked up ahead of the history.
        setChain((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))].slice(0, 8));
      } catch {
        /* RPC may reject the range — the live watcher still fills the feed from here on */
      }
    })();
    return () => { cancelled = true; };
  }, [onchainMode, publicClient, deployment]);

  useWatchContractEvent({
    address: deployment?.settlementEscrow,
    abi: escrowAbi,
    eventName: "Charged",
    enabled: onchainMode,
    poll: true,
    pollingInterval: 4000,
    onLogs(logs) {
      const rows = logs.map(toRow).reverse();
      setChain((prev) => [...rows.filter((r) => !prev.some((p) => p.id === r.id)), ...prev].slice(0, 8));
    },
  });

  // Gateway SSE (only when NEXT_PUBLIC_GATEWAY_URL is configured).
  const { events, connected } = useEventStream(8);
  const sseLive = connected && events.length > 0;

  // Simulated fallback.
  const [running, setRunning] = useState(true);
  const [sim, setSim] = useState<Row[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    if (onchainMode || sseLive || !running) return;
    const id = setInterval(() => {
      const f = FEED[seq.current % FEED.length];
      seq.current += 1;
      onSpend?.(f.fee);
      setSim((prev) => [{ id: `s${seq.current}`, ...f }, ...prev].slice(0, 8));
    }, 2600);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onchainMode, sseLive, running]);

  const mode = onchainMode ? "onchain" : sseLive ? "live" : "simulated";
  const rows: Row[] = onchainMode
    ? chain
    : sseLive
      ? events.map((e) => ({ id: e.id, cap: e.capability, vendor: e.vendor, fee: e.feeUsdg, ms: e.routingMs + e.executionMs }))
      : sim;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-widest" style={{ color: C.lime }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: mode === "simulated" && !running ? C.mute : C.lime }} />
          Agent activity
          <span className="ml-2 lowercase tracking-normal" style={{ color: mode === "simulated" ? C.mute : C.lime }}>· {mode}</span>
        </div>
        {mode === "simulated" && (
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
        {rows.length === 0 && (
          <div style={{ color: C.mute }}>
            {onchainMode ? "waiting for onchain calls — try the test agent call" : "waiting for calls…"}
          </div>
        )}
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
