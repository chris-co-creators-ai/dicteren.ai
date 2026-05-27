import { Mic } from "lucide-react";

export function MockTrayMac() {
  return (
    <div
      className="rounded-2xl border bg-white p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center justify-end gap-4 rounded-lg px-3 py-2"
        style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%)" }}
      >
        <span className="text-xs text-white/70">📶</span>
        <span className="text-xs text-white/70">🔋</span>
        <div className="relative">
          <Mic className="size-4 text-white" strokeWidth={2} />
          <span
            className="absolute -right-1.5 -top-1.5 size-2 rounded-full"
            style={{ background: "var(--orange)" }}
          />
        </div>
        <span className="text-xs text-white/70">🔍</span>
        <span className="text-xs text-white/70">10:42</span>
      </div>
      <p className="mt-3 text-center text-xs text-[color:var(--text-muted)]">
        Op Mac, rechtsboven in de menubalk
      </p>
    </div>
  );
}

export function MockTrayWindows() {
  return (
    <div
      className="rounded-2xl border bg-white p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center justify-end gap-3 rounded-lg px-3 py-2"
        style={{ background: "linear-gradient(180deg, #2a2a2e 0%, #1f1f23 100%)" }}
      >
        <span className="text-xs text-white/70">^</span>
        <div className="relative">
          <Mic className="size-4 text-white" strokeWidth={2} />
          <span
            className="absolute -right-1.5 -top-1.5 size-2 rounded-full"
            style={{ background: "var(--orange)" }}
          />
        </div>
        <span className="text-xs text-white/70">📶</span>
        <span className="text-xs text-white/70">🔊</span>
        <div className="text-right">
          <div className="text-[10px] text-white/80">10:42</div>
          <div className="text-[9px] text-white/60">27-05-2026</div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-[color:var(--text-muted)]">
        Op Windows, rechtsonder in de taakbalk
      </p>
    </div>
  );
}
