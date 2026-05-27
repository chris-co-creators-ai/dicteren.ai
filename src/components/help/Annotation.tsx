import { Lightbulb } from "lucide-react";
import { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "tip" | "warn";
  className?: string;
};

export function Annotation({ children, tone = "tip", className = "" }: Props) {
  const palette =
    tone === "warn"
      ? {
          bg: "#FFF5EC",
          border: "#FFD2A1",
          icon: "#9E4A0C",
          text: "#5B2A05",
        }
      : {
          bg: "#FFF8EB",
          border: "#F8C97A",
          icon: "#A45B07",
          text: "#3E2308",
        };

  return (
    <div
      className={`relative flex gap-3 rounded-xl border p-3 text-sm leading-relaxed ${className}`}
      style={{
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
      }}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full"
        style={{ background: "white", border: `1px solid ${palette.border}` }}
      >
        <Lightbulb className="size-4" style={{ color: palette.icon }} strokeWidth={2.2} />
      </span>
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

export function Callout({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4 text-sm leading-relaxed"
      style={{
        background: "var(--aqua-50)",
        borderColor: "var(--aqua-200)",
        color: "var(--text)",
      }}
    >
      {label && (
        <div
          className="mb-1.5 text-xs font-bold uppercase tracking-wide"
          style={{ color: "var(--navy)" }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
