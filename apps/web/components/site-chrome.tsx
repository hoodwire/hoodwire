"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const C = {
  bg: "#0B0E0C",
  lime: "#C6F53E",
  limeDim: "rgba(198,245,62,0.14)",
  limeBorder: "rgba(198,245,62,0.22)",
  ink: "#EDEFEA",
  mute: "#8A9484",
  line: "rgba(138,148,132,0.18)",
  panel: "rgba(16,20,15,0.72)",
};

const NAV = [
  { label: "Protocol", href: "/#protocol" },
  { label: "Registry", href: "/registry" },
  { label: "Docs", href: "/docs" },
  { label: "Metrics", href: "/metrics" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "rgba(11,14,12,0.7)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.line}` }}
    >
      <div className="mx-auto flex items-center justify-between px-6 py-4" style={{ maxWidth: 1150 }}>
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg" style={{ color: C.ink }}>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[13px] font-bold" style={{ background: C.lime, color: C.bg }}>⌁</span>
          hoodwire
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              style={{ color: path === n.href ? C.lime : C.mute, transition: "color 200ms" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/dashboard"
          className="hidden md:inline-block px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: C.lime, color: C.bg, boxShadow: "0 0 24px rgba(198,245,62,0.3)" }}
        >
          Launch App
        </Link>
        <button className="md:hidden text-2xl px-1" style={{ color: C.ink }} onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open && (
        <div className="md:hidden px-6 pb-5 space-y-3" style={{ borderTop: `1px solid ${C.line}` }}>
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="block pt-3" style={{ color: C.mute }} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <Link href="/dashboard" className="inline-block mt-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: C.lime, color: C.bg }} onClick={() => setOpen(false)}>
            Launch App
          </Link>
        </div>
      )}
    </header>
  );
}

export function PageShell({ title, eyebrow, children }: { title: React.ReactNode; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.ink }}>
      <SiteNav />
      <main className="mx-auto px-6 pt-16 pb-28" style={{ maxWidth: 1150 }}>
        <div className="text-xs tracking-[0.24em] uppercase mb-4" style={{ color: C.lime }}>{eyebrow}</div>
        <h1 className="font-semibold tracking-tight mb-12" style={{ fontSize: "clamp(1.9rem, 4vw, 2.9rem)", lineHeight: 1.1 }}>
          {title}
        </h1>
        {children}
      </main>
      <footer className="px-6 py-8 text-xs" style={{ borderTop: `1px solid ${C.line}`, color: C.mute }}>
        <div className="mx-auto flex flex-wrap justify-between gap-3" style={{ maxWidth: 1150 }}>
          <span>© 2026 Hoodwire · The financial routing layer for AI agents</span>
          <span>Built on <span style={{ color: C.lime }}>Robinhood Chain</span> · 100ms blocks</span>
        </div>
      </footer>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-6 ${className}`} style={{ border: `1px solid ${C.line}`, background: C.panel }}>
      {children}
    </div>
  );
}

export const mono = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
