"use client";

import { useState } from "react";
import { PageShell, Card, C, mono } from "@/components/site-chrome";
import { CAPABILITIES } from "@/lib/vendors";

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "capabilities", label: "Capabilities" },
  { id: "routing", label: "How routing works" },
  { id: "budget", label: "Budget controls" },
  { id: "vendors", label: "Register a vendor" },
];

const MCP_SNIPPET = `{
  "mcpServers": {
    "hoodwire": {
      "url": "https://mcp.hoodwire.xyz",
      "headers": { "Authorization": "Bearer hw-sk-…" }
    }
  }
}`;

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden my-4" style={{ border: `1px solid ${C.line}`, background: "rgba(13,17,12,0.8)" }}>
      <div className="flex justify-end px-3 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
        <button
          onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="text-xs px-2 py-0.5 rounded"
          style={{ color: copied ? C.lime : C.mute, border: `1px solid ${copied ? C.limeBorder : C.line}` }}
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="p-4 text-[13px] leading-6 overflow-x-auto" style={{ ...mono, color: C.ink }}>{children}</pre>
    </div>
  );
}

export default function Docs() {
  return (
    <PageShell eyebrow="Documentation" title={<>Build with <span style={{ color: C.lime }}>Hoodwire.</span></>}>
      <div className="grid lg:grid-cols-4 gap-10">
        <aside className="lg:sticky lg:top-28 self-start">
          <nav className="space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block px-3 py-2 rounded-lg transition-colors" style={{ color: C.mute }}>
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-3 space-y-16 leading-relaxed">
          <section id="quickstart">
            <h2 className="text-xl font-semibold mb-3">Quickstart</h2>
            <p style={{ color: C.mute }}>
              Hoodwire is one MCP server. Add it to your agent&apos;s config, fund your deposit
              wallet with USDG on Robinhood Chain, and every financial capability is available —
              no vendor SDKs, no per-protocol keys.
            </p>
            <Code>{MCP_SNIPPET}</Code>
            <p style={{ color: C.mute }}>
              Then call any capability. Hoodwire runs the auction and returns one result:
            </p>
            <Code>{`> execute_swap(tokenOut: "tNVDA", amountUsdg: 2400)
// → uniswap-v3 · 0.14 USDG · 612ms ✓
// losing bid: pleiades @ 0.16 USDG`}</Code>
          </section>

          <section id="capabilities">
            <h2 className="text-xl font-semibold mb-3">Capabilities</h2>
            <div className="space-y-3">
              {CAPABILITIES.map((c) => (
                <Card key={c.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <span style={{ ...mono, color: C.lime }}>{c.name}</span>
                    <span className="text-xs" style={{ ...mono, color: C.mute }}>{c.fee} · p50 {c.p50}</span>
                  </div>
                  <p className="text-sm" style={{ color: C.mute }}>{c.desc}</p>
                </Card>
              ))}
            </div>
          </section>

          <section id="routing">
            <h2 className="text-xl font-semibold mb-3">How routing works</h2>
            <p style={{ color: C.mute }}>
              Every call opens a &lt;100ms auction across all registered vendors that support the
              capability. Bids are scored on three normalized axes — <b style={{ color: C.ink }}>price (50%)</b>,{" "}
              <b style={{ color: C.ink }}>latency (30%)</b>, and <b style={{ color: C.ink }}>onchain reputation (20%)</b>.
              The winner executes; USDG settles onchain in 100ms blocks; the vendor&apos;s reputation
              updates with the real outcome. Round-trip p50 is 782ms.
            </p>
          </section>

          <section id="budget">
            <h2 className="text-xl font-semibold mb-3">Budget controls</h2>
            <p style={{ color: C.mute }}>
              Three controls protect your deposit: a <b style={{ color: C.ink }}>daily spend limit</b> (agent halts,
              resets UTC midnight — also enforced onchain by SettlementEscrow), an{" "}
              <b style={{ color: C.ink }}>approval threshold</b> (calls above it pause for human approval), and a{" "}
              <b style={{ color: C.ink }}>low-balance alert</b> (you get pinged, the agent keeps running).
              Withdraw the remaining balance anytime — no lock-up.
            </p>
            <Code>{`> hoodwire_set_budget(dailyLimitUsdg: 25, approvalThresholdUsdg: 0.5)`}</Code>
          </section>

          <section id="vendors">
            <h2 className="text-xl font-semibold mb-3">Register a vendor</h2>
            <p style={{ color: C.mute }}>
              Registration is permissionless: stake 500 USDG in the VendorRegistry, publish a quote
              endpoint, and your service enters the auction on the next block. Reputation starts at a
              neutral prior and is earned per settled call. Provably bad quotes are slashable.
            </p>
            <Code>{`registry.register(
  keccak256("your-vendor-id"),
  keccak256("https://quote.yourservice.xyz"),
  [keccak256("execute_swap")],
  500e6 // USDG stake
)`}</Code>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
