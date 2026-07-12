"use client";

import { useState } from "react";
import { PageShell, C, mono } from "@/components/site-chrome";
import { VENDORS, FEE_RANGES } from "@/lib/vendors";

const TYPES = ["All", "AMM", "Oracle", "Lending", "Indexer"] as const;

export default function Registry() {
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const rows = VENDORS.filter((v) => type === "All" || v.type === type);

  return (
    <PageShell eyebrow="Open registry" title={<>Vendors compete. <span style={{ color: C.lime }}>Agents win.</span></>}>
      <div className="flex flex-wrap gap-2 mb-8">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="px-4 py-1.5 rounded-full text-sm transition-colors"
            style={{
              border: `1px solid ${t === type ? C.limeBorder : C.line}`,
              color: t === type ? C.lime : C.mute,
              background: t === type ? C.limeDim : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ border: `1px solid ${C.line}`, background: C.panel }}>
        <table className="w-full text-sm" style={{ minWidth: 680 }}>
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest" style={{ color: C.mute, borderBottom: `1px solid ${C.line}` }}>
              {["Vendor", "Type", "Capabilities", "Reputation", "p50", "Fee range"].map((h) => (
                <th key={h} className="px-5 py-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={mono}>
            {rows.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none" }}>
                <td className="px-5 py-4" style={{ color: C.ink }}>{v.id}</td>
                <td className="px-5 py-4" style={{ color: C.mute }}>{v.type}</td>
                <td className="px-5 py-4 text-xs" style={{ color: C.mute }}>{v.capabilities.join(" · ")}</td>
                <td className="px-5 py-4" style={{ color: C.lime }}>◆ {v.reputation.toFixed(1)}</td>
                <td className="px-5 py-4" style={{ color: C.mute }}>{v.p50LatencyMs}ms</td>
                <td className="px-5 py-4" style={{ color: C.mute }}>{FEE_RANGES[v.id]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-xl p-8 text-center" style={{ border: `1px solid ${C.limeBorder}`, background: C.limeDim }}>
        <p className="mb-4" style={{ color: C.ink }}>
          Run a financial service? Stake 500 USDG and enter the auction on the next block.
        </p>
        <a href="/docs#vendors" className="inline-block px-6 py-3 rounded-lg font-semibold text-sm" style={{ background: C.lime, color: C.bg }}>
          Register your service ▸
        </a>
      </div>
    </PageShell>
  );
}
