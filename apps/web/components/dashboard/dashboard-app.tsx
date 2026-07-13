"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { PageShell, C } from "@/components/site-chrome";
import { makeConfig, deploymentFor, chainName, ROBINHOOD, type Deployment } from "@/lib/chain";
import { Providers } from "./providers";
import { DemoDashboard } from "./demo-dashboard";
import { LiveDashboard } from "./live-dashboard";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function DashboardApp({ local }: { local: Deployment | null }) {
  const [config] = useState(() => makeConfig(local));
  return (
    <Providers config={config}>
      <PageShell
        eyebrow="App · Robinhood Chain Testnet"
        title={<>Your agent&apos;s <span style={{ color: C.lime }}>deposit wallet.</span></>}
      >
        <DashboardBody local={local} />
      </PageShell>
    </Providers>
  );
}

function DashboardBody({ local }: { local: Deployment | null }) {
  const { address, isConnected, chainId } = useAccount();
  const deployment = deploymentFor(chainId, local);
  return (
    <>
      <ConnectBar local={local} />
      {isConnected && deployment && address ? (
        <LiveDashboard deployment={deployment} address={address} />
      ) : (
        <DemoDashboard />
      )}
    </>
  );
}

function ConnectBar({ local }: { local: Deployment | null }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const injected = connectors[0];
  const deployment = deploymentFor(chainId, local);
  const unsupported = isConnected && !deployment;

  const btn = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200";

  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3"
      style={{ border: `1px solid ${C.line}`, background: C.panel }}
    >
      <div className="text-sm flex items-center gap-2" style={{ color: C.mute }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: deployment ? C.lime : C.mute }} />
        {!isConnected ? (
          "Connect an injected wallet to use live balances."
        ) : unsupported ? (
          <>Connected to <span style={{ color: C.ink }}>{chainName(chainId, local)}</span> — switch to a supported network.</>
        ) : (
          <>Connected <span style={{ color: C.ink }}>{short(address)}</span> · {chainName(chainId, local)}</>
        )}
      </div>
      <div className="flex gap-2">
        {unsupported && (
          <button
            onClick={() => switchChain({ chainId: ROBINHOOD.chainId })}
            className={btn}
            style={{ border: `1px solid ${C.limeBorder}`, color: C.lime }}
          >
            Switch to Robinhood Chain Testnet
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
