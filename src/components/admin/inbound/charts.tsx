"use client";
// Inbound — SVG charts ported from the prototype (charts.jsx). Gradient ids use
// useId() instead of Math.random() so SSR/client markup matches (no hydration drift).
import { useState, useRef, useId } from "react";
import { fmt } from "@/lib/inbound/format";
import type { SeriesPoint } from "@/lib/inbound/data";

/* Sparkline — tiny inline trend */
export function Sparkline({ data, w = 88, h = 26, color = "var(--aqua-600)", fill = true }: { data: number[]; w?: number; h?: number; color?: string; fill?: boolean }) {
  const id = useId().replace(/:/g, "");
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 3 - ((v - min) / rng) * (h - 6)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {fill && <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>}
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  );
}

function metricVal(d: SeriesPoint, m: string): number {
  if (m === "cost_micros") return d.cost_micros / 1e6;
  if (m === "conversions") return d.conversions;
  return (d as unknown as Record<string, number>)[m];
}
function axisLabel(v: number, m: string, full?: boolean): string {
  if (m === "cost_micros") return "€" + (full ? v.toLocaleString("nl-NL", { maximumFractionDigits: 0 }) : v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v)));
  if (v >= 1000 && !full) return (v / 1000).toFixed(1) + "k";
  return v.toLocaleString("nl-NL", { maximumFractionDigits: m === "conversions" ? 1 : 0 });
}

/* Big interactive time-series area chart with hover crosshair */
export function AreaChart({ series, metric = "cost_micros", height = 280, color = "var(--orange)" }: { series: SeriesPoint[]; metric?: string; height?: number; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gid = useId().replace(/:/g, "");
  const W = 1000, H = height, padL = 56, padR = 16, padT = 16, padB = 30;
  const vals = series.map((d) => metricVal(d, metric));
  const max = Math.max(...vals) * 1.12 || 1;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = (i: number) => padL + (i / (series.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const pts = series.map((d, i) => [x(i), y(metricVal(d, metric))]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${pts[pts.length - 1][0]} ${padT + innerH} L${pts[0][0]} ${padT + innerH} Z`;
  const ticks = 4;
  const onMove = (e: React.MouseEvent) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let idx = Math.round(((px - padL) / innerW) * (series.length - 1));
    idx = Math.max(0, Math.min(series.length - 1, idx));
    setHover(idx);
  };
  return (
    <div ref={wrapRef} style={{ position: "relative" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.26" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = max * (1 - i / ticks);
          const yy = padT + (i / ticks) * innerH;
          return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border-soft)" strokeWidth="1" /><text x={padL - 10} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--fg-faint)" fontFamily="var(--font-mono)">{axisLabel(v, metric)}</text></g>;
        })}
        {series.map((d, i) => (i % Math.ceil(series.length / 8) === 0) && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--fg-faint)" fontFamily="var(--font-mono)">{fmt.date(d.date)}</text>)}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {hover != null && <g><line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + innerH} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" /><circle cx={x(hover)} cy={y(metricVal(series[hover], metric))} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" /></g>}
      </svg>
      {hover != null && (
        <div style={{ position: "absolute", left: `calc(${(x(hover) / W) * 100}% )`, top: 0, transform: "translateX(-50%)", pointerEvents: "none" }}>
          <div style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", boxShadow: "var(--shadow-pop)", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 11, color: "var(--fg-soft)", marginBottom: 3 }}>{fmt.dateLong(series[hover].date)}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{axisLabel(metricVal(series[hover], metric), metric, true)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Horizontal bar (impression-share style) */
export function MiniBar({ value, color = "var(--orange)", label }: { value: number; color?: string; label?: boolean }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: value * 100 + "%", background: color, borderRadius: 3 }} />
      </span>
      {label && <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", width: 38, textAlign: "right" }}>{fmt.pct(value, 0)}</span>}
    </div>
  );
}

/* Donut for funnel/share */
export function Donut({ value, size = 56, sw = 6, color = "var(--orange)" }: { value: number; size?: number; sw?: number; color?: string }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c * (1 - value)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.26} fontWeight="700" fill="var(--fg)" fontFamily="var(--font-mono)">{Math.round(value * 100)}</text>
    </svg>
  );
}
