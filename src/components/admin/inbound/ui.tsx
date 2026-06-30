"use client";
// Inbound — UI primitives ported from the Claude Design prototype (ui.jsx).
// window-globals are now real imports; rendering is identical.
import { useState, useRef, useEffect, type CSSProperties, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Icon } from "./icons";
import { fmt } from "@/lib/inbound/format";
import { INTENTS, type Intent } from "@/lib/inbound/data";

export function Badge({
  tone = "muted", dot, children, style,
}: {
  tone?: string; dot?: boolean; children: ReactNode; style?: CSSProperties;
}) {
  return (
    <span className={"badge badge-" + tone} style={style}>
      {dot && <span className="dot" style={{ background: "currentColor" }} />}
      {children}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string; size?: "sm"; icon?: string; iconRight?: string; children?: ReactNode;
};
export function Btn({ variant = "default", size, icon, iconRight, children, ...p }: BtnProps) {
  return (
    <button className={"btn btn-" + variant + (size ? " btn-" + size : "") + (!children ? " btn-icon" : "")} {...p}>
      {icon && <Icon d={icon} size={size === "sm" ? 13 : 14} />}
      {children}
      {iconRight && <Icon d={iconRight} size={13} />}
    </button>
  );
}

export function Card({ children, style, pad, className }: { children: ReactNode; style?: CSSProperties; pad?: boolean; className?: string }) {
  return <div className={"card" + (className ? " " + className : "")} style={pad ? { padding: 18, ...style } : style}>{children}</div>;
}

export function CardHead({ title, desc, right, icon }: { title: ReactNode; desc?: ReactNode; right?: ReactNode; icon?: string }) {
  return (
    <div className="card-head">
      <div className="row" style={{ gap: 10 }}>
        {icon && <span style={{ color: "var(--fg-soft)" }}><Icon d={icon} size={16} /></span>}
        <div>
          <div className="card-title">{title}</div>
          {desc && <div className="card-desc">{desc}</div>}
        </div>
      </div>
      {right && <div style={{ marginLeft: "auto" }} className="row">{right}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    ENABLED: ["green", "Actief"], PAUSED: ["amber", "Gepauzeerd"], REMOVED: ["muted", "Verwijderd"],
    ADDED: ["green", "Toegevoegd"], EXCLUDED: ["red", "Uitgesloten"], NONE: ["muted", "Geen"],
  };
  const [tone, label] = m[status] || ["muted", status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function IntentBadge({ intent }: { intent: Intent }) {
  const I = INTENTS[intent];
  return <Badge tone={I.cls.replace("badge-", "")}>{I.label}</Badge>;
}

export function MatchBadge({ m }: { m: string }) {
  const map: Record<string, string> = { EXACT: "Exact", PHRASE: "Phrase", BROAD: "Broad" };
  return <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>[{map[m] || m}]</span>;
}

export function QScore({ v }: { v: number }) {
  const tone = v >= 8 ? "var(--green)" : v >= 6 ? "var(--amber)" : "var(--red)";
  return (
    <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
      <span style={{ width: 28, height: 5, borderRadius: 3, background: "var(--surface-3)", position: "relative", overflow: "hidden" }}>
        <span style={{ position: "absolute", inset: 0, width: v * 10 + "%", background: tone }} />
      </span>
      <span className="mono" style={{ fontSize: 12, color: tone, width: 14 }}>{v}</span>
    </span>
  );
}

export function Delta({ cur, prev, invert, suffix }: { cur: number; prev?: number | null; invert?: boolean; suffix?: string }) {
  if (prev == null || prev === 0) return null;
  const change = (cur - prev) / prev;
  const good = invert ? change < 0 : change > 0;
  const up = change > 0;
  if (Math.abs(change) < 0.0005) return <span className="kpi-delta"><span className="vs" style={{ marginLeft: 0 }}>geen verandering</span></span>;
  return (
    <span className={"kpi-delta " + (good ? "up" : "down")}>
      <Icon d={up ? "arrowUp" : "arrowDown"} size={13} />{fmt.pct(Math.abs(change), 1)}
      <span className="vs">vs vorige{suffix || ""}</span>
    </span>
  );
}

export function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts: [string, string][] = [["today", "Vandaag"], ["7d", "7 dagen"], ["30d", "30 dagen"], ["custom", "Custom"]];
  return (
    <div className="seg">
      {opts.map(([v, l]) => <button key={v} className={value === v ? "active" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export function Select({ value, options, onChange, width }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = options.find((o) => o.v === value);
  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <button className={"select" + (open ? " active" : "")} style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setOpen((o) => !o)}>
        <span>{cur ? cur.l : "—"}</span><Icon d="chevDown" size={14} cls="chev" />
      </button>
      {open && (
        <div className="menu" style={{ width: width || "auto", marginTop: 4 }}>
          {options.map((o) => (
            <button key={o.v} className={"menu-item" + (o.v === value ? " active" : "")} onClick={() => { onChange(o.v); setOpen(false); }}>
              {o.v === value && <Icon d="check" size={14} />}
              <span style={{ marginLeft: o.v === value ? 0 : 22 }}>{o.l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Dialog({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog" style={wide ? { maxWidth: 640 } : undefined} onMouseDown={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="overlay" style={{ placeItems: "stretch", padding: 0, justifyContent: "flex-end" }} onMouseDown={onClose}>
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
