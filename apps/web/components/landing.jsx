"use client";

import React, { useState, useEffect, useRef } from "react";

/*
 * Hoodwire landing page.
 * Self-contained client component: WebGL shader background (with a reduced-motion
 * and no-WebGL fallback), a live routing visualization, and interactive budget
 * controls. All figures are illustrative and internally consistent.
 */

const C = {
  bg: "#0B0E0C",
  bgSoft: "rgba(16,20,15,0.72)",
  lime: "#C6F53E",
  limeDim: "rgba(198,245,62,0.14)",
  limeBorder: "rgba(198,245,62,0.22)",
  ink: "#EDEFEA",
  mute: "#8A9484",
  line: "rgba(138,148,132,0.18)",
};

/* ============ WebGL flowing-noise shader background ============ */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p = p * 2.02 + vec2(13.7, 71.3);
    a *= 0.5;
  }
  return v * 0.5 + 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.045;
  vec2 m = (u_mouse - 0.5) * 0.35;

  // domain-warped flow — silk / smoke
  float n1 = fbm(p * 1.35 + vec2(t * 0.8, -t * 0.5));
  float n2 = fbm(p * 2.1 + n1 * 1.6 + vec2(-t * 0.6, t * 0.35) + m);
  float n3 = fbm(p * 3.4 - n2 * 1.2 + vec2(t * 0.25, t * 0.5));

  vec3 base   = vec3(0.043, 0.055, 0.047);   // #0B0E0C
  vec3 forest = vec3(0.075, 0.125, 0.082);   // deep green
  vec3 moss   = vec3(0.128, 0.205, 0.118);   // mid green
  vec3 lime   = vec3(0.776, 0.961, 0.243);   // #C6F53E

  vec3 col = base;
  col = mix(col, forest, smoothstep(0.25, 0.85, n2));
  col = mix(col, moss, smoothstep(0.55, 0.95, n2) * 0.55);

  // lime ridge highlights — thin bright veins where the field folds
  float ridge = smoothstep(0.62, 0.92, n2) * smoothstep(0.35, 0.75, n3);
  col += lime * pow(ridge, 2.6) * 0.30;

  // soft aurora bloom from the top
  float topGlow = smoothstep(0.35, 1.05, uv.y);
  col += lime * topGlow * (0.030 + 0.045 * n1);

  // mouse halo — barely-there warmth around the cursor
  float d = distance(uv * vec2(u_res.x / u_res.y, 1.0),
                     u_mouse * vec2(u_res.x / u_res.y, 1.0));
  col += lime * exp(-d * 5.5) * 0.045;

  // vignette so content stays legible
  float vig = smoothstep(1.35, 0.35, distance(uv, vec2(0.5, 0.62)));
  col *= mix(0.62, 1.0, vig);

  // fade the whole field toward the page bottom
  col = mix(col, base, smoothstep(0.55, 0.05, uv.y) * 0.75);

  gl_FragColor = vec4(col, 1.0);
}
`;

function ShaderBackground() {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl =
      canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) { setFailed(true); return; }

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { setFailed(true); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // fullscreen triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // lerped mouse for buttery motion
    let mx = 0.5, my = 0.65, tx = 0.5, ty = 0.65;
    const onMove = (e) => {
      tx = e.clientX / window.innerWidth;
      ty = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf, running = true;
    const t0 = performance.now();

    const frame = () => {
      if (!running) return;
      resize();
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    frame();

    // pause when tab hidden
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!reduced) { running = true; frame(); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (failed) {
    return (
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(198,245,62,0.08), transparent 60%), #0B0E0C",
        }}
      />
    );
  }
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

/* ============ film grain overlay ============ */

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

function Grain() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 3,
        backgroundImage: `url("${GRAIN}")`,
        opacity: 0.05,
        mixBlendMode: "overlay",
      }}
      aria-hidden="true"
    />
  );
}

/* ============ scroll progress ============ */

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-0.5" style={{ zIndex: 60 }}>
      <div
        className="h-full"
        style={{
          width: `${p * 100}%`,
          background: C.lime,
          boxShadow: "0 0 12px rgba(198,245,62,0.6)",
          transition: "width 80ms linear",
        }}
      />
    </div>
  );
}

/* ============ shared hooks & primitives ============ */

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setInView(true),
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView(0.16);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(28px)",
        transition: `opacity 800ms cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 800ms cubic-bezier(.22,.61,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function CountUp({ end, decimals = 0, suffix = "", duration = 1500 }) {
  const [ref, inView] = useInView(0.6);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);
  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* spotlight card — cursor-tracked radial glow + gradient border */
function SpotlightCard({ children, className = "", style = {} }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`hw-spot rounded-xl ${className}`}
      style={{ border: `1px solid ${C.line}`, background: C.bgSoft, ...style }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="text-xs tracking-[0.24em] uppercase mb-4" style={{ color: C.lime }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2
      className="font-semibold tracking-tight"
      style={{ color: C.ink, fontSize: "clamp(1.55rem, 4.5vw, 2.9rem)", lineHeight: 1.12 }}
    >
      {children}
    </h2>
  );
}

const Lime = ({ children }) => <span className="hw-shimmer">{children}</span>;

/* ============ hero routing terminal (with 3D tilt) ============ */

const CALLS = [
  { cap: "execute_swap", detail: "2,400 USDG → tNVDA",
    bids: [{ v: "uniswap-v3", price: 0.14, ms: 380 }, { v: "pleiades", price: 0.16, ms: 344 }],
    win: 0, total: "0.14 USDG", rt: "612ms" },
  { cap: "get_stock_price", detail: "tAAPL / USDG",
    bids: [{ v: "chainlink", price: 0.002, ms: 96 }, { v: "hoodwire-cache", price: 0.001, ms: 41 }],
    win: 1, total: "0.001 USDG", rt: "188ms" },
  { cap: "supply_collateral", detail: "5,000 USDG → Morpho",
    bids: [{ v: "morpho-blue", price: 0.08, ms: 610 }, { v: "morpho-vaults", price: 0.09, ms: 655 }],
    win: 0, total: "0.08 USDG", rt: "784ms" },
  { cap: "execute_swap", detail: "tGOOGL → USDG",
    bids: [{ v: "pleiades", price: 0.11, ms: 355 }, { v: "uniswap-v3", price: 0.13, ms: 371 }],
    win: 0, total: "0.11 USDG", rt: "596ms" },
  { cap: "bridge_quote", detail: "USDG → Ethereum L1",
    bids: [{ v: "native-bridge", price: 0.01, ms: 205 }, { v: "fastlane", price: 0.03, ms: 118 }],
    win: 0, total: "0.01 USDG", rt: "342ms" },
  { cap: "portfolio_snapshot", detail: "wallet 0x9f…a21e",
    bids: [{ v: "hoodwire-core", price: 0.005, ms: 120 }, { v: "indexer.rh", price: 0.006, ms: 133 }],
    win: 0, total: "0.005 USDG", rt: "214ms" },
];

function RoutingViz() {
  const [i, setI] = useState(0);
  const [log, setLog] = useState([
    "get_lending_rate · morpho-blue · 0.02 USDG · 236ms ✓",
    "execute_swap · uniswap-v3 · 0.14 USDG · 604ms ✓",
  ]);
  const [seq, setSeq] = useState(12847);
  const tiltRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setI((p) => {
        const cur = CALLS[p];
        const w = cur.bids[cur.win];
        setLog((l) => [`${cur.cap} · ${w.v} · ${cur.total} · ${cur.rt} ✓`, ...l].slice(0, 4));
        setSeq((s) => s + 1);
        return (p + 1) % CALLS.length;
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const onTilt = (e) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
  };
  const resetTilt = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
  };

  const call = CALLS[i];
  const winner = call.bids[call.win];
  const mono = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

  return (
    <div
      ref={tiltRef}
      onMouseMove={onTilt}
      onMouseLeave={resetTilt}
      className="rounded-2xl overflow-hidden"
      style={{
        ...mono,
        background: "rgba(13,17,12,0.78)",
        border: `1px solid ${C.limeBorder}`,
        boxShadow:
          "0 0 80px rgba(198,245,62,0.12), 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(198,245,62,0.10)",
        backdropFilter: "blur(14px)",
        transition: "transform 300ms cubic-bezier(.22,.61,.36,1)",
        willChange: "transform",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 text-xs"
        style={{ borderBottom: `1px solid ${C.line}`, color: C.mute }}
      >
        <span className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full hw-pulse" style={{ background: C.lime }} />
          hoodwire · router
        </span>
        <span className="tabular-nums">req № {seq.toLocaleString("en-US")}</span>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 text-xs" key={`path-${i}`}>
          <span className="px-2.5 py-1.5 rounded-md whitespace-nowrap" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
            agent
          </span>
          <span className="flex-1 h-px hw-dash" />
          <span
            className="px-2.5 py-1.5 rounded-md whitespace-nowrap"
            style={{ border: `1px solid ${C.limeBorder}`, color: C.lime, background: C.limeDim }}
          >
            hoodwire
          </span>
          <span className="flex-1 h-px hw-dash" />
          <span className="px-2.5 py-1.5 rounded-md whitespace-nowrap hw-fadein" style={{ border: `1px solid ${C.limeBorder}`, color: C.lime }}>
            {winner.v}
          </span>
        </div>
      </div>

      <div className="px-4 py-3" key={`bids-${i}`}>
        <div className="text-xs mb-2" style={{ color: C.mute }}>
          <span style={{ color: C.ink }}>{call.cap}</span>{"  ·  "}{call.detail}
        </div>
        <div className="space-y-1.5">
          {call.bids.map((b, bi) => (
            <div
              key={b.v}
              className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5 hw-fadein"
              style={{
                animationDelay: `${bi * 120}ms`,
                border: `1px solid ${bi === call.win ? C.limeBorder : "transparent"}`,
                background: bi === call.win ? C.limeDim : "transparent",
                color: bi === call.win ? C.lime : C.mute,
              }}
            >
              <span>{b.v}</span>
              <span className="tabular-nums">
                {b.price} USDG · {b.ms}ms {bi === call.win ? "· win" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="px-4 py-3 text-[11px] leading-5 space-y-1"
        style={{ borderTop: `1px solid ${C.line}`, color: C.mute }}
      >
        {log.map((l, li) => (
          <div key={l + li} style={{ opacity: 1 - li * 0.22 }} className={li === 0 ? "hw-fadein" : ""}>
            <span style={{ color: li === 0 ? C.lime : C.mute }}>▸</span> {l}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 text-[11px] flex justify-between" style={{ borderTop: `1px solid ${C.line}`, color: C.mute }}>
        <span>settlement · Robinhood Chain · 100ms blocks</span>
        <span style={{ color: C.lime }}>&lt;800ms round-trip</span>
      </div>
    </div>
  );
}

/* ============ marquee strip ============ */

const MARQUEE = [
  "execute_swap", "tNVDA · 24/7", "100ms blocks", "USDG settlement",
  "get_stock_price", "morpho lending", "chainlink oracles", "<800ms round-trip",
  "onchain reputation", "tAAPL · 24/7", "uniswap × pleiades", "one MCP endpoint",
];

function Marquee() {
  const row = [...MARQUEE, ...MARQUEE];
  return (
    <div
      className="relative overflow-hidden py-4"
      style={{
        borderTop: `1px solid ${C.line}`,
        borderBottom: `1px solid ${C.line}`,
        maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="hw-marquee flex gap-10 whitespace-nowrap text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.mute }}>
        {row.map((m, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="hover:text-current" style={{ transition: "color 200ms" }}>{m}</span>
            <span style={{ color: C.lime, opacity: 0.5 }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============ code block ============ */

const MCP_JSON = `{
  "mcpServers": {
    "hoodwire": {
      "url": "https://mcp.hoodwire.xyz",
      "headers": { "Authorization": "Bearer hw-sk-…" }
    }
  }
}`;

function CodeCard() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(MCP_JSON).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const k = { color: C.lime };
  const s = { color: "#A8C97F" };
  const c = { color: C.mute };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(13,17,12,0.8)",
        border: `1px solid ${C.line}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(198,245,62,0.08)",
        backdropFilter: "blur(10px)",
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ borderBottom: `1px solid ${C.line}`, color: C.mute }}>
        <span className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(138,148,132,0.35)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(138,148,132,0.25)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.limeDim, border: `1px solid ${C.limeBorder}` }} />
          </span>
          mcp.config.json
        </span>
        <button
          onClick={copy}
          className="px-2.5 py-1 rounded-md transition-all duration-200"
          style={{
            border: `1px solid ${copied ? C.limeBorder : C.line}`,
            color: copied ? C.lime : C.mute,
            background: copied ? C.limeDim : "transparent",
          }}
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="p-4 sm:p-5 text-[10.5px] sm:text-[13px] leading-5 sm:leading-6 overflow-x-auto whitespace-pre-wrap break-words sm:whitespace-pre" style={{ color: C.ink }}>
        <div style={c}>{"// 01 — add Hoodwire to your agent's MCP config"}</div>
        {"{\n"}
        {"  "}<span style={k}>"mcpServers"</span>{": {\n"}
        {"    "}<span style={k}>"hoodwire"</span>{": {\n"}
        {"      "}<span style={k}>"url"</span>{": "}<span style={s}>"https://mcp.hoodwire.xyz"</span>{",\n"}
        {"      "}<span style={k}>"headers"</span>{": { "}<span style={k}>"Authorization"</span>{": "}<span style={s}>"Bearer hw-sk-…"</span>{" }\n"}
        {"    }\n  }\n}"}
        {"\n\n"}
        <div style={c}>{"// 02 — fund once. USDG on Robinhood Chain. No bank, no per-vendor API keys."}</div>
        {"\n"}
        <div style={c}>{"// 03 — call any capability. Hoodwire runs the auction."}</div>
        <span style={{ color: C.lime }}>{"> "}</span>
        {"execute_swap("}<span style={s}>"2400 USDG"</span>{", "}<span style={s}>"tNVDA"</span>{")\n"}
        <div style={c}>{"  // → uniswap-v3 · 0.14 USDG · 612ms ✓"}</div>
        <div style={c}>{"  // → or pleiades, if it wins the round"}</div>
      </pre>
    </div>
  );
}

/* ============ budget controls ============ */

function Slider({ label, index, value, setValue, min, max, step, unit, note, fmt }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-5" style={{ borderTop: index > 0 ? `1px solid ${C.line}` : "none" }}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs tracking-widest uppercase" style={{ color: C.mute }}>
          {String(index + 1).padStart(2, "0")} · {label}
        </span>
        <span className="text-lg sm:text-2xl font-semibold tabular-nums whitespace-nowrap" style={{ color: C.lime, textShadow: "0 0 24px rgba(198,245,62,0.35)" }}>
          {fmt(value)}
        </span>
      </div>
      <div className="text-xs mb-3" style={{ color: C.mute }}>{unit}</div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="hw-range w-full"
        aria-label={label}
        style={{
          background: `linear-gradient(90deg, rgba(198,245,62,0.75) ${pct}%, rgba(138,148,132,0.25) ${pct}%)`,
        }}
      />
      <p className="text-sm mt-3 leading-relaxed" style={{ color: C.mute }}>{note}</p>
    </div>
  );
}

function BudgetPanel() {
  const [daily, setDaily] = useState(25);
  const [approve, setApprove] = useState(0.5);
  const [alertAt, setAlertAt] = useState(5);
  const usd = (v) => `${v.toFixed(2)} USDG`;

  return (
    <SpotlightCard className="p-6 md:p-8" style={{ borderRadius: 16 }}>
      <div className="flex items-center gap-2 text-xs tracking-widest uppercase mb-2" style={{ color: C.lime }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full hw-pulse" style={{ background: C.lime }} />
        Budget controls
      </div>
      <Slider
        index={0} label="Daily spend limit" value={daily} setValue={setDaily}
        min={0} max={200} step={1} fmt={usd} unit="USDG / day · then halt"
        note={daily === 0
          ? "Unlimited. Your agent spends freely until the balance runs out."
          : `Your agent stops calling capabilities after spending ${usd(daily)} in a day. Resets at UTC midnight.`}
      />
      <Slider
        index={1} label="Approval threshold" value={approve} setValue={setApprove}
        min={0} max={10} step={0.05} fmt={usd} unit="USDG / call · needs approval"
        note={approve === 0
          ? "Full autopilot. Every call executes without a pause."
          : `Calls above ${usd(approve)} pause and notify you before executing.`}
      />
      <Slider
        index={2} label="Low balance alert" value={alertAt} setValue={setAlertAt}
        min={0} max={50} step={0.5} fmt={usd} unit="USDG balance · then notify"
        note={`Hoodwire pings you when your deposit drops to ${usd(alertAt)}. Your agent keeps running — you decide whether to top up.`}
      />
      <div className="mt-4 pt-4 text-sm flex items-center gap-2" style={{ borderTop: `1px solid ${C.line}`, color: C.ink }}>
        <span style={{ color: C.lime }}>↩</span> Withdraw anytime, no lock-up. Every deduction is onchain and auditable.
      </div>
    </SpotlightCard>
  );
}

/* ============ page ============ */

export default function HoodwireLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = ["Protocol", "Registry", "Docs", "Metrics"];

  const steps = [
    {
      n: "01", t: "Call", h: "Call a capability. Not a vendor.",
      d: "get_stock_price · execute_swap · supply_collateral — one MCP connection, any agent framework. Your agent never chooses a DEX, an oracle, or a lending market.",
      tag: "agent → hoodwire · any MCP client",
    },
    {
      n: "02", t: "Route", h: "Every vendor bids. Best route wins.",
      d: "A real-time auction across every registered vendor on Robinhood Chain, ranked by price × latency × onchain reputation. Uniswap vs Pleiades, decided per request.",
      tag: "hoodwire → uniswap · pleiades · morpho · ⋯ · <100ms",
    },
    {
      n: "03", t: "Settle", h: "USDG settled. Result returned.",
      d: "Payment clears onchain in 100ms blocks. The result streams back to your agent and the vendor's reputation updates onchain — every call makes routing smarter.",
      tag: "vendor → agent · <800ms round-trip",
    },
  ];

  const chainCards = [
    { t: "An AI-native L2", d: "Robinhood Chain is a permissionless Ethereum L2 built on Arbitrum, designed for financial services and real-world assets. Agents are first-class citizens, not an afterthought." },
    { t: "100ms blocks. Sub-second settlement.", d: "Routing decides in under 100ms and payment clears within the same second. Your agent never waits on a block." },
    { t: "Native RWA & Stock Tokens", d: "Tokenized stocks and ETFs — tNVDA, tAAPL, tGOOGL — tradable 24/7, priced by Chainlink, swappable on Uniswap and Pleiades, usable as collateral on Morpho." },
    { t: "One wallet. USDG settlement.", d: "Fund a single deposit wallet with USDG, the Paxos stablecoin native to the ecosystem. Gas is ETH. Everything else is handled per request." },
  ];

  const vendors = [
    { name: "uniswap-v3", type: "AMM", rep: "98.4", p50: "340ms", fee: "0.12–0.16 USDG" },
    { name: "pleiades", type: "AMM", rep: "97.1", p50: "362ms", fee: "0.10–0.17 USDG" },
    { name: "chainlink-feeds", type: "Oracle", rep: "99.2", p50: "88ms", fee: "0.002 USDG" },
    { name: "morpho-blue", type: "Lending", rep: "96.8", p50: "610ms", fee: "0.06–0.09 USDG" },
    { name: "native-bridge", type: "Bridge", rep: "95.3", p50: "205ms", fee: "0.01 USDG" },
  ];

  return (
    <div
      className="min-h-screen relative"
      style={{ background: C.bg, color: C.ink, fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        ::selection { background: rgba(198,245,62,0.28); color: #EDEFEA; }
        html { scroll-behavior: smooth; }

        @keyframes hwPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        .hw-pulse { animation: hwPulse 1.8s ease-in-out infinite; }

        @keyframes hwFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .hw-fadein { animation: hwFadeIn 420ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes hwDash { to { background-position: -24px 0; } }
        .hw-dash {
          background-image: linear-gradient(90deg, rgba(198,245,62,0.55) 0 6px, transparent 6px 12px);
          background-size: 12px 1px;
          animation: hwDash 900ms linear infinite;
        }

        @keyframes hwMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .hw-marquee { animation: hwMarquee 36s linear infinite; width: max-content; }
        .hw-marquee:hover { animation-play-state: paused; }

        @keyframes hwShimmer { to { background-position: 200% center; } }
        .hw-shimmer {
          background: linear-gradient(110deg, #C6F53E 30%, #EFFFC0 45%, #C6F53E 60%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: hwShimmer 5s linear infinite;
        }

        .hw-spot { position: relative; overflow: hidden; transition: border-color 250ms ease, transform 250ms ease, box-shadow 250ms ease; }
        .hw-spot::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(198,245,62,0.09), transparent 62%);
          opacity: 0; transition: opacity 300ms ease;
        }
        .hw-spot:hover::before { opacity: 1; }
        .hw-spot:hover { border-color: rgba(198,245,62,0.32) !important; transform: translateY(-3px); box-shadow: 0 18px 44px rgba(0,0,0,0.4); }

        .hw-range { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 999px; outline: none; cursor: pointer; }
        .hw-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 999px;
          background: #C6F53E; border: 3px solid #0B0E0C;
          box-shadow: 0 0 0 1px rgba(198,245,62,0.5), 0 0 16px rgba(198,245,62,0.45);
          transition: transform 200ms ease;
        }
        .hw-range::-webkit-slider-thumb:hover { transform: scale(1.18); }
        .hw-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 999px;
          background: #C6F53E; border: 3px solid #0B0E0C;
          box-shadow: 0 0 0 1px rgba(198,245,62,0.5), 0 0 16px rgba(198,245,62,0.45);
        }
        .hw-range::-moz-range-track { height: 4px; border-radius: 999px; background: rgba(138,148,132,0.25); }
        .hw-range::-moz-range-progress { height: 4px; border-radius: 999px; background: rgba(198,245,62,0.7); }

        .hw-link { color: #8A9484; transition: color 200ms ease; }
        .hw-link:hover { color: #C6F53E; }

        .hw-cta {
          position: relative;
          box-shadow: 0 0 36px rgba(198,245,62,0.35), inset 0 1px 0 rgba(255,255,255,0.35);
          transition: transform 220ms cubic-bezier(.22,.61,.36,1), box-shadow 220ms ease;
        }
        .hw-cta:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 0 56px rgba(198,245,62,0.5), inset 0 1px 0 rgba(255,255,255,0.35); }

        @media (prefers-reduced-motion: reduce) {
          .hw-pulse, .hw-dash, .hw-fadein, .hw-marquee, .hw-shimmer { animation: none !important; }
          .hw-shimmer { -webkit-text-fill-color: #C6F53E; color: #C6F53E; background: none; }
          html { scroll-behavior: auto; }
        }
      `}</style>

      <ShaderBackground />
      <Grain />
      <ScrollProgress />

      {/* everything above the shader */}
      <div className="relative" style={{ zIndex: 10 }}>

        {/* ——— NAVBAR ——— */}
        <header
          className="sticky top-0 z-50"
          style={{
            background: "rgba(11,14,12,0.6)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div className="mx-auto flex items-center justify-between px-6 py-4" style={{ maxWidth: 1150 }}>
            <a href="#" className="flex items-center gap-2 font-semibold tracking-tight text-lg" style={{ color: C.ink }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[13px] font-bold" style={{ background: C.lime, color: C.bg, boxShadow: "0 0 18px rgba(198,245,62,0.4)" }}>
                ⌁
              </span>
              hoodwire
            </a>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              {nav.map((n) => (
                <a key={n} href={n === "Protocol" ? "/#protocol" : `/${n.toLowerCase()}`} className="hw-link">{n}</a>
              ))}
            </nav>
            <div className="hidden md:block">
              <a href="/dashboard" className="hw-cta inline-block px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: C.lime, color: C.bg }}>
                Launch App
              </a>
            </div>
            <button className="md:hidden text-2xl leading-none px-1" style={{ color: C.ink }} onClick={() => setMenuOpen((m) => !m)} aria-label="Toggle menu">
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
          {menuOpen && (
            <div className="md:hidden px-6 pb-5 space-y-3" style={{ borderTop: `1px solid ${C.line}`, background: "rgba(11,14,12,0.9)" }}>
              {nav.map((n) => (
                <a key={n} href={n === "Protocol" ? "/#protocol" : `/${n.toLowerCase()}`} className="hw-link block pt-3" onClick={() => setMenuOpen(false)}>{n}</a>
              ))}
              <a href="/dashboard" onClick={() => setMenuOpen(false)} className="inline-block mt-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: C.lime, color: C.bg }}>
                Launch App
              </a>
            </div>
          )}
        </header>

        {/* ——— HERO ——— */}
        <section id="protocol" className="relative">
          <div className="relative mx-auto px-6 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center" style={{ maxWidth: 1150, paddingTop: "clamp(72px, 12vw, 104px)", paddingBottom: "clamp(72px, 12vw, 110px)" }}>
            <Reveal>
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-7" style={{ border: `1px solid ${C.limeBorder}`, color: C.mute, background: "rgba(11,14,12,0.5)", backdropFilter: "blur(6px)" }}>
                <span className="w-1.5 h-1.5 rounded-full hw-pulse" style={{ background: C.lime }} />
                Live on Robinhood Chain testnet
              </div>
              <h1
                className="font-bold tracking-tight"
                style={{
                  fontSize: "clamp(2.1rem, 7vw, 5rem)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.03em",
                  textShadow: "0 2px 40px rgba(0,0,0,0.5)",
                }}
              >
                The financial routing layer <Lime>for AI agents.</Lime>
              </h1>
              <p className="mt-6 text-lg leading-relaxed max-w-lg" style={{ color: C.mute }}>
                Fund once with <span style={{ color: C.ink }}>USDG</span>. Your agent reaches every
                financial service on Robinhood Chain — swaps, prices, lending, Stock Tokens — through
                one MCP connection. Routed, paid, and settled in under a second.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <a href="/docs" className="hw-cta px-6 py-3 rounded-lg font-semibold text-sm" style={{ background: C.lime, color: C.bg }}>
                  Connect your agent
                </a>
                <a
                  href="/registry"
                  className="px-6 py-3 rounded-lg font-semibold text-sm transition-colors duration-200"
                  style={{ border: `1px solid ${C.line}`, color: C.ink, background: "rgba(11,14,12,0.4)", backdropFilter: "blur(6px)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.limeBorder)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line)}
                >
                  Browse capabilities
                </a>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <RoutingViz />
              <p className="text-xs mt-3 text-center" style={{ color: C.mute }}>
                ✦ Hoodwire runs the auction — your agent sees one result.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ——— MARQUEE ——— */}
        <Marquee />

        {/* ——— STATS ——— */}
        <section id="metrics" style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(11,14,12,0.45)", backdropFilter: "blur(8px)" }}>
          <div className="mx-auto px-6 grid grid-cols-2 lg:grid-cols-4" style={{ maxWidth: 1150 }}>
            {[
              { v: <CountUp end={47} />, l: "Capabilities indexed" },
              { v: <CountUp end={782} suffix="ms" />, l: "Round-trip p50" },
              { v: <CountUp end={23} suffix="%" />, l: "Avg. saving vs naive routing" },
              { v: <CountUp end={3} duration={900} />, l: "Lines to integrate" },
            ].map((s, i) => (
              <div key={s.l} className="py-10 px-6" style={{ borderLeft: i > 0 ? `1px solid ${C.line}` : "none" }}>
                <div className="text-4xl font-bold tabular-nums tracking-tight" style={{ color: C.lime, textShadow: "0 0 30px rgba(198,245,62,0.3)" }}>
                  {s.v}
                </div>
                <div className="text-xs mt-2 tracking-wide uppercase" style={{ color: C.mute }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ——— THREE STEPS ——— */}
        <section className="mx-auto px-6" style={{ maxWidth: 1150, paddingTop: "clamp(72px, 13vw, 130px)", paddingBottom: "clamp(72px, 13vw, 130px)" }}>
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle>One call. <Lime>Best route.</Lime></SectionTitle>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <SpotlightCard className="p-7 h-full flex flex-col" style={{ borderRadius: 16 }}>
                  <div className="flex items-baseline justify-between mb-6">
                    <span className="text-sm font-semibold" style={{ color: C.lime }}>{s.n}</span>
                    <span className="text-xs tracking-[0.22em] uppercase" style={{ color: C.mute }}>{s.t}</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight mb-3">{s.h}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: C.mute }}>{s.d}</p>
                  <div className="mt-6 pt-4 text-[11px]" style={{ borderTop: `1px solid ${C.line}`, color: C.lime, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {s.tag}
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ——— INTEGRATION ——— */}
        <section id="integrate" className="mx-auto px-6" style={{ maxWidth: 1150, paddingBottom: "clamp(72px, 13vw, 130px)" }}>
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            <Reveal className="lg:col-span-2">
              <Eyebrow>Integration</Eyebrow>
              <SectionTitle>Three lines. <Lime>Every financial service.</Lime></SectionTitle>
              <p className="mt-5 leading-relaxed" style={{ color: C.mute }}>
                Add one MCP server to your agent's config. Fund the deposit wallet with USDG. That's
                the whole integration — no vendor SDKs, no per-protocol API keys, no chain plumbing.
              </p>
              <ul className="mt-7 space-y-4 text-sm">
                {[
                  ["Zero config", "You never pick a vendor or wire up a protocol."],
                  ["Always current", "New vendors appear at launch. Degraded ones drop out of the auction."],
                  ["Gets smarter", "Every settled call updates vendor reputation onchain."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span style={{ color: C.lime }}>▸</span>
                    <span>
                      <span className="font-semibold">{t}.</span>{" "}
                      <span style={{ color: C.mute }}>{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} className="lg:col-span-3">
              <CodeCard />
            </Reveal>
          </div>
        </section>

        {/* ——— BUDGET CONTROLS ——— */}
        <section className="mx-auto px-6" style={{ maxWidth: 1150, paddingBottom: "clamp(72px, 13vw, 130px)" }}>
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            <Reveal className="lg:col-span-2 lg:sticky lg:top-28">
              <Eyebrow>Spend controls</Eyebrow>
              <SectionTitle>Fund once. <Lime>You set the limits.</Lime></SectionTitle>
              <p className="mt-5 leading-relaxed" style={{ color: C.mute }}>
                Top up your Hoodwire wallet with USDG on Robinhood Chain. Hoodwire draws per request
                as your agent calls capabilities — every deduction auditable onchain, in 100ms blocks.
              </p>
            </Reveal>
            <Reveal delay={120} className="lg:col-span-3">
              <BudgetPanel />
            </Reveal>
          </div>
        </section>

        {/* ——— WHY ROBINHOOD CHAIN ——— */}
        <section className="mx-auto px-6" style={{ maxWidth: 1150, paddingBottom: "clamp(72px, 13vw, 130px)" }}>
          <Reveal>
            <Eyebrow>The chain</Eyebrow>
            <SectionTitle>Why <Lime>Robinhood Chain.</Lime></SectionTitle>
            <p className="mt-5 max-w-2xl leading-relaxed" style={{ color: C.mute }}>
              A permissionless Ethereum L2 built on Arbitrum, live since July 2026 — purpose-built for
              financial services, real-world assets, and the agents that use them. Gas in ETH, settled
              to Ethereum.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6 mt-12">
            {chainCards.map((cd, i) => (
              <Reveal key={cd.t} delay={i * 90}>
                <SpotlightCard className="p-7 h-full" style={{ borderRadius: 16 }}>
                  <h3 className="text-lg font-semibold tracking-tight mb-3">{cd.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.mute }}>{cd.d}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ——— VENDOR REGISTRY ——— */}
        <section id="registry" className="mx-auto px-6" style={{ maxWidth: 1150, paddingBottom: "clamp(72px, 13vw, 130px)" }}>
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Eyebrow>Open registry</Eyebrow>
                <SectionTitle>Vendors compete. <Lime>Agents win.</Lime></SectionTitle>
              </div>
              <a
                href="#"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{ border: `1px solid ${C.limeBorder}`, color: C.lime }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.limeDim; e.currentTarget.style.boxShadow = "0 0 28px rgba(198,245,62,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; }}
              >
                Register your service ▸
              </a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-10 rounded-2xl overflow-hidden overflow-x-auto" style={{ border: `1px solid ${C.line}`, background: "rgba(13,17,12,0.7)", backdropFilter: "blur(8px)" }}>
              <table className="w-full text-xs sm:text-sm sm:min-w-[500px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest" style={{ color: C.mute, borderBottom: `1px solid ${C.line}` }}>
                    {["Vendor", "Type", "Reputation", "p50 latency", "Fee range"].map((h, i) => (
                      <th key={h} className={`px-3 sm:px-6 py-3 sm:py-4 font-medium ${i >= 3 ? "hidden sm:table-cell" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {vendors.map((v, i) => (
                    <tr
                      key={v.name}
                      className="transition-colors duration-200"
                      style={{ borderBottom: i < vendors.length - 1 ? `1px solid ${C.line}` : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(198,245,62,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4" style={{ color: C.ink }}>{v.name}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4" style={{ color: C.mute }}>{v.type}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4" style={{ color: C.lime }}>◆ {v.rep}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell" style={{ color: C.mute }}>{v.p50}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell" style={{ color: C.mute }}>{v.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color: C.mute }}>
              Reputation is computed onchain from settled calls: success rate × latency consistency × dispute history.
            </p>
          </Reveal>
        </section>

        {/* ——— FOOTER ——— */}
        <footer id="docs" style={{ borderTop: `1px solid ${C.line}`, background: "rgba(11,14,12,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="mx-auto px-6 py-12 md:py-16 grid md:grid-cols-4 gap-10" style={{ maxWidth: 1150 }}>
            <div>
              <div className="flex items-center gap-2 font-semibold text-lg mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[13px] font-bold" style={{ background: C.lime, color: C.bg }}>⌁</span>
                hoodwire
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.mute }}>
                One MCP connection.<br />Every financial service.<br />Settled in USDG on Robinhood Chain.
              </p>
            </div>
            {[
              ["Protocol", ["How it works", "Vendor registry", "Documentation", "Network metrics"]],
              ["Open source", ["GitHub", "MCP integration", "Registry spec", "Settlement contracts"]],
              ["Connect", ["hello@hoodwire.xyz", "X / Twitter", "Discord", "Status"]],
            ].map(([h, links]) => (
              <div key={h}>
                <div className="text-xs uppercase tracking-widest mb-4" style={{ color: C.ink }}>{h}</div>
                <ul className="space-y-2.5 text-sm">
                  {links.map((l) => (
                    <li key={l}><a href="#" className="hw-link">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mx-auto px-6 py-6 flex flex-wrap justify-between gap-3 text-xs" style={{ maxWidth: 1150, borderTop: `1px solid ${C.line}`, color: C.mute }}>
            <span>© 2026 Hoodwire · The financial routing layer for AI agents</span>
            <span>Built on <span style={{ color: C.lime }}>Robinhood Chain</span> · 100ms blocks · settled to Ethereum</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
