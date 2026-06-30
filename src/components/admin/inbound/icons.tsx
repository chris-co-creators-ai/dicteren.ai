"use client";
// Inbound — lucide-style inline icons (1.75 stroke), ported from the Claude
// Design prototype's ui.jsx so the dashboard renders pixel-identical.
import type { CSSProperties } from "react";

export const IC: Record<string, string> = {
  megaphone: "M3 11l14-5v12L3 13M3 11v2M8 12v5a2 2 0 002 2h1l1-3", layout: "M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z",
  cpu: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 6h12v12H6zM9 9h6v6H9z",
  users: "M16 19v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100-.01M22 19v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0119 7",
  key: "M14 7a4 4 0 11-5.66 5.66L3 18v3h3l5.34-5.34A4 4 0 0114 7z", file: "M14 3v5h5M14 3H6v18h12V8z",
  target: "M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0M12 12m-5 0a5 5 0 1010 0a5 5 0 10-10 0M12 12m-1 0a1 1 0 102 0a1 1 0 10-2 0",
  search: "M11 11m-7 0a7 7 0 1014 0a7 7 0 10-14 0M21 21l-4.35-4.35", list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  check: "M20 6L9 17l-5-5", x: "M18 6L6 18M6 6l12 12", chevDown: "M6 9l6 6 6-6", chevRight: "M9 6l6 6-6 6", chevLeft: "M15 6l-6 6 6 6",
  arrowUp: "M12 19V5M5 12l7-7 7 7", arrowDown: "M12 5v14M5 12l7 7 7 7", arrowUpRight: "M7 17L17 7M7 7h10v10",
  refresh: "M3 12a9 9 0 019-9 9 9 0 016.36 2.64L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9 9 0 01-6.36-2.64L3 16M3 21v-5h5",
  trend: "M3 17l6-6 4 4 8-8M21 7v6M21 7h-6", dots: "M12 5h.01M12 12h.01M12 19h.01", filter: "M3 4h18l-7 8v6l-4 2v-8z",
  plus: "M12 5v14M5 12h14", minus: "M5 12h14", pause: "M8 5v14M16 5v14", play: "M6 4l14 8-14 8z",
  ban: "M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0M5.6 5.6l12.8 12.8", wallet: "M19 7H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2zM16 13h.01M3 9V7a2 2 0 012-2h11",
  gauge: "M12 14l3-3M3.34 19a10 10 0 1117.32 0M12 14m-1 0a1 1 0 102 0a1 1 0 10-2 0", spark: "M12 3l1.9 5.8L20 9l-5 3.5L16.5 19 12 15.5 7.5 19 9 12.5 4 9l6.1-.2z",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18", clock: "M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0M12 7v5l3 2",
  bolt: "M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z", shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0", link: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5",
  flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7", mail: "M3 7l9 6 9-6M3 7h18v10H3z", sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  doc: "M14 3v5h5M14 3H6v18h12V8zM9 13h6M9 17h6", sync: "M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0114.85-3.36L21 8M20.5 15a9 9 0 01-14.85 3.36L3 16",
  zap: "M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z", activity: "M22 12h-4l-3 9L9 3l-3 9H2", grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
};

export function Icon({
  d, size = 16, sw = 1.75, fill = "none", style, cls,
}: {
  d: string; size?: number; sw?: number; fill?: string; style?: CSSProperties; cls?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} className={cls} aria-hidden="true">
      {(IC[d] || d).split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}
