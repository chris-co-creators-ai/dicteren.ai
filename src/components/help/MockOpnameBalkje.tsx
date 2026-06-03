// Toont het opname-balkje zoals het tijdens dicteren onderin je scherm verschijnt.
// Komt overeen met de echte app (repo RecordingOverlay.tsx): logo links, label
// "Aan het luisteren…", meebewegende golfbalkjes, en de tijd rechts.

const BARS = [9, 16, 7, 20, 13, 8];

export function MockOpnameBalkje() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-white px-4 py-2.5 shadow-sm">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white"
          style={{ background: "var(--navy)" }}
          aria-hidden
        >
          D
        </span>
        <span className="text-sm font-semibold text-[color:var(--navy)]">
          Aan het luisteren…
        </span>
        <span className="flex items-end gap-0.5" aria-hidden>
          {BARS.map((h, i) => (
            <i
              key={i}
              className="w-1 rounded-full"
              style={{ height: `${h}px`, background: "var(--orange)" }}
            />
          ))}
        </span>
        <span className="text-xs tabular-nums text-[color:var(--text-muted)]">
          00:07
        </span>
      </div>
      <p className="text-xs text-[color:var(--text-muted)]">
        Zo ziet het opname-balkje eruit terwijl je praat.
      </p>
    </div>
  );
}
