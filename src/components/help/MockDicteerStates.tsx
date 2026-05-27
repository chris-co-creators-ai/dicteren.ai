import { Loader2, Mic } from "lucide-react";

function Pill({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone: "idle" | "rec" | "busy";
}) {
  const colors =
    tone === "rec"
      ? { bg: "#FFE9D9", border: "#FFB37A", text: "#7A2E04", dot: "#FF5A2E" }
      : tone === "busy"
        ? { bg: "var(--aqua-50)", border: "var(--aqua-200)", text: "var(--navy)", dot: "var(--aqua-400)" }
        : { bg: "white", border: "var(--border)", text: "var(--text-muted)", dot: "#bbb" };

  return (
    <div className="text-center">
      <div
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 shadow-sm"
        style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
      >
        {children}
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">{label}</p>
    </div>
  );
}

export function MockDicteerStates() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Pill label="Voor het indrukken" tone="idle">
        <Mic className="size-4" style={{ color: "#888" }} strokeWidth={2} />
        <span className="text-xs font-medium">Wachten</span>
      </Pill>

      <Pill label="Tijdens het praten" tone="rec">
        <span className="relative inline-flex size-2">
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-75"
            style={{ background: "#FF5A2E" }}
          />
          <span
            className="relative inline-flex size-2 rounded-full"
            style={{ background: "#FF5A2E" }}
          />
        </span>
        <span className="text-xs font-bold">Luistert...</span>
      </Pill>

      <Pill label="Na het loslaten" tone="busy">
        <Loader2
          className="size-4 animate-spin"
          style={{ color: "var(--navy)" }}
          strokeWidth={2.5}
        />
        <span className="text-xs font-medium">Schrijven...</span>
      </Pill>
    </div>
  );
}
