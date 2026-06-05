import type { ReactNode } from "react";

/** A labelled row in the style panel. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="style-row">
      <span className="style-label">{label}</span>
      {children}
    </label>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColorInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const safe = HEX.test(value) ? value : "#000000";
  return (
    <span className="color-input">
      <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        className="hex"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </span>
  );
}

export function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function NumberInput({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <input
      type="number"
      className="num"
      min={min}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({ options, active, onSelect }: { options: Option<T>[]; active: T; onSelect: (v: T) => void }) {
  return (
    <span className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={active === o.value ? "seg seg--active" : "seg"}
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

export function Swatches({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <span className="swatches">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className="swatch"
          title={c}
          style={{ background: c === "none" ? "transparent" : c }}
          onClick={() => onPick(c)}
        >
          {c === "none" ? "⌀" : ""}
        </button>
      ))}
    </span>
  );
}
