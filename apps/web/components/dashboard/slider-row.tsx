"use client";

import { C } from "@/components/site-chrome";

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  hint,
  busy,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  hint: string;
  busy?: string | null;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-4" style={{ borderTop: `1px solid ${C.line}` }}>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs uppercase tracking-widest" style={{ color: C.mute }}>{label}</span>
        <span className="text-lg font-semibold tabular-nums" style={{ color: C.lime }}>{value.toFixed(2)} USDG</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        className="w-full appearance-none h-1 rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(90deg, rgba(198,245,62,0.75) ${pct}%, rgba(138,148,132,0.25) ${pct}%)`,
          accentColor: C.lime,
        }}
      />
      <p className="text-xs mt-2" style={{ color: busy ? C.lime : C.mute }}>{busy ?? hint}</p>
    </div>
  );
}
