"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { PageShell, C, mono } from "@/components/site-chrome";
import { makeConfig, type LocalChain } from "@/lib/chain";
import { Providers } from "./providers";
import { DemoDashboard } from "./demo-dashboard";
import { LiveDashboard } from "./live-dashboard";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function DashboardApp({ local }: { local: LocalChain | null }) {
  const [config] = useState(() => makeConfig(local));
  return (
    <Providers config={config}>
      <PageShell
        eyebrow={local ? "App · local chain" : "App · demo mode"}
        title={<>Your agent&apos;s <span style={{ color: C.lime }}>deposit wallet.</span></>}
      >
        <DashboardBody local={local} />
      </PageShell>
    </Providers>
  );
}

function DashboardBody({ local }: { local: LocalChain | null }) {
  const { address, isConnected, chainId } = useAccount();
  const connectedToLocal = isConnected && !!local && chainId === local.chainId;
  return (
    <>
      <ConnectBar local={local} />
      {connectedToLocal ? (
        <LiveDashboard local={local} address={address as `0x${string}`} />
      ) : (
        <DemoDashboard />
      )}
    </>
  );
}

function ConnectBar({ local }: { local: LocalChain | null }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const injected = connectors[0];
  const wrongNetwork = isConnected && !!local && chainId !== local.chainId;

  const btn = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200";

  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3"
      style={{ border: `1px solid ${C.line}`, background: C.panel }}
    >
      <div className="text-sm" style={{ color: C.mute }}>
        {!local ? (
          <>No local deployment found — run <code style={mono}>npm run chain:dev</code>, then reload.</>
        ) : !isConnected ? (
          "Connect an injected wallet on the local anvil chain for live balances."
        ) : wrongNetwork ? (
          <>Wrong network — switch to <span style={{ color: C.ink }}>chain {local.chainId}</span>.</>
        ) : (
          <>Connected <span style={{ color: C.ink }}>{short(address)}</span> · anvil {local?.chainId}</>
        )}
      </div>
      <div className="flex gap-2">
        {wrongNetwork && local && (
          <button onClick={() => switchChain({ chainId: local.chainId })} className={btn} style={{ border: `1px solid ${C.limeBorder}`, color: C.lime }}>
            Switch network
          </button>
        )}
        {!isConnected ? (
          <button
            onClick={() => injected && connect({ connector: injected })}
            disabled={!injected || isPending}
            className={btn}
            style={{ background: C.lime, color: C.bg, opacity: injected && !isPending ? 1 : 0.6 }}
          >
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        ) : (
          <button onClick={() => disconnect()} className={btn} style={{ border: `1px solid ${C.line}`, color: C.ink }}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
