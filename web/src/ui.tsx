import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { fmtUsd } from "./lib/chain";

/* ---------------------------------------------------------------- tiny hash router */
export function useRoute() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const f = () => setHash(location.hash || "#/");
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return hash.slice(1) || "/";
}
export const go = (path: string) => { location.hash = path; };
export const back = () => (history.length > 1 ? history.back() : go("/"));

/* ---------------------------------------------------------------- building blocks */
export function Money({ units, center, small }: { units: bigint; center?: boolean; small?: boolean }) {
  const [int, dec] = fmtUsd(units).split(",");
  return <div className={`amount${center ? " center" : ""}`} style={small ? { fontSize: 40 } : undefined}>
    US$ {int}{dec && dec !== "00" ? <sup>{dec.padEnd(2, "0")}</sup> : null}
  </div>;
}

export function Header({ onBack, onClose, right }: { onBack?: () => void; onClose?: () => void; right?: ReactNode }) {
  return <div className="header">
    {onBack ? <button className="icon-btn" onClick={onBack} aria-label="Atrás"><ArrowLeft size={24} strokeWidth={2} /></button>
      : onClose ? <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={24} strokeWidth={2} /></button> : <span />}
    <span style={{ display: "flex" }}>{right}</span>
  </div>;
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const daysLeft = (ts: number) => Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86_400_000));

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return <span className="ic avatar" style={{ width: size, height: size, fontSize: size > 60 ? 28 : 16 }}>{initials(name)}</span>;
}

export function Toast({ msg }: { msg: string | null }) { return msg ? <div className="toast" role="status">{msg}</div> : null; }

/** Full-screen sheet (modal flow) with an X in the header. */
export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return <div style={{ position: "fixed", inset: 0, background: "var(--surface)", zIndex: 10, overflowY: "auto" }}>
    <div className="screen"><Header onClose={onClose} />{children}</div>
  </div>;
}

/** Quick action: black icon in a light grey circle with 1–2 words under it. */
export function Action({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ border: 0, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--ink-950)", fontSize: 13, fontWeight: 600, flex: 1 }}>
    <span className="ic" style={{ width: 56, height: 56, borderRadius: 999, background: "var(--surface-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
    {label}
  </button>;
}

/** Chips with an "Otro" option that opens a numeric input. */
export function AmountPicker({ value, onChange, presets }: { value: number; onChange: (v: number) => void; presets: number[] }) {
  const [custom, setCustom] = useState(!presets.includes(value));
  return <>
    <div className="chips">
      {presets.map((v) => <button key={v} className={`chip${!custom && value === v ? " on" : ""}`} onClick={() => { setCustom(false); onChange(v); }}>US$ {v}</button>)}
      <button className={`chip${custom ? " on" : ""}`} onClick={() => setCustom(true)}>Otro</button>
    </div>
    {custom && <input className="input" style={{ marginTop: 10 }} inputMode="decimal" placeholder="US$ 0" autoFocus
      value={value ? String(value) : ""} onChange={(e) => onChange(Math.max(0, Math.min(1000, Number(e.target.value.replace(",", ".")) || 0)))} />}
  </>;
}

/** Native share sheet on phones; on desktop, copy + WhatsApp. */
export function ShareSheet({ url, text, onClose, say }: { url: string; text: string; onClose: () => void; say: (m: string) => void }) {
  return <Sheet onClose={onClose}>
    <h1 className="title">Invitar</h1>
    <p className="question">¿Por dónde lo mandás?</p>
    <div style={{ marginTop: 24 }}>
      <a className="row" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
        <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg></span>
        <span className="txt"><div className="t">WhatsApp</div><div className="s">Mandalo al grupo</div></span>
      </a>
      <button className="row" onClick={async () => { try { await navigator.clipboard.writeText(url); say("Link copiado"); } catch { say(url); } }}>
        <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></span>
        <span className="txt"><div className="t">Copiar link</div><div className="s">Pegalo donde quieras</div></span>
      </button>
      {"share" in navigator && <button className="row" onClick={() => navigator.share({ title: "Prometo", text, url }).catch(() => {})}>
        <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg></span>
        <span className="txt"><div className="t">Más opciones</div><div className="s">Telegram, Instagram…</div></span>
      </button>}
    </div>
  </Sheet>;
}

/* ---------------------------------------------------------------- brand */
/** The Prometo mark: a "P" that is also a planted flag with a check — a promise kept. */
export function Glyph({ size = 28, white = false }: { size?: number; white?: boolean }) {
  const fg = white ? "#FFFFFF" : "var(--accent-500)", cut = white ? "var(--accent-500)" : "#FFFFFF";
  return <svg width={size * 470 / 632} height={size} viewBox="280 196 470 632" aria-hidden="true" style={{ display: "block", flex: "none" }}>
    <g transform="translate(-19 -38)">
      <path d="M356 808 V292 H584 A170 170 0 0 1 584 632 H356 Z" fill={fg} />
      <path d="M356 808 V292" stroke={fg} strokeWidth="96" strokeLinecap="round" />
      <path d="M452 468 L526 540 L642 420" fill="none" stroke={cut} strokeWidth="64" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>;
}

/** Glyph + wordmark. */
export function Wordmark({ size = 22, muted = false }: { size?: number; muted?: boolean }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32 }} aria-label="Prometo">
    <Glyph size={size * 1.15} />
    <span style={{ font: `800 ${size}px/1 'Plus Jakarta Sans', system-ui, sans-serif`, letterSpacing: -size * 0.045, color: muted ? "var(--line)" : "var(--ink-950)" }}>prometo</span>
  </span>;
}
