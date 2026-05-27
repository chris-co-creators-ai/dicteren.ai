function Key({
  label,
  wide,
  highlight,
}: {
  label: string;
  wide?: boolean;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm ${
        wide ? "min-w-[64px]" : "min-w-[34px]"
      }`}
      style={{
        background: highlight ? "var(--orange)" : "white",
        color: highlight ? "white" : "var(--text)",
        borderColor: highlight ? "var(--orange-600)" : "var(--border)",
        boxShadow: highlight ? "0 0 0 4px rgba(245, 124, 32, 0.18)" : undefined,
      }}
    >
      {label}
    </span>
  );
}

export function MockShortcutKeys() {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#F7F7F8", borderColor: "var(--border)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Key label="esc" />
        <Key label="`" />
        <Key label="1" />
        <Key label="2" />
        <Key label="3" />
        <Key label="..." />
        <Key label="0" />
        <Key label="-" />
        <Key label="=" />
        <Key label="del" wide />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
        <Key label="ctrl" />
        <Key label="alt" />
        <Key label="cmd" />
        <Key label="option" highlight />
        <Key label="spatie" wide highlight />
        <Key label="option" />
        <Key label="cmd" />
      </div>
      <p className="mt-4 text-center text-xs text-[color:var(--text-muted)]">
        Druk op <span className="font-bold text-[color:var(--orange-600)]">option</span>{" "}
        en houd vast. Praat. Laat los.
      </p>
    </div>
  );
}
