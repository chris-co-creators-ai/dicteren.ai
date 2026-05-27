"use client";

import { Building2, Users } from "lucide-react";

export type CrmTabKey = "people" | "organizations";

export function CrmTabs({
  active,
  onChange,
}: {
  active: CrmTabKey;
  onChange: (k: CrmTabKey) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border bg-white p-1 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => onChange("people")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          active === "people"
            ? "text-white"
            : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
        }`}
        style={active === "people" ? { background: "#042660" } : undefined}
      >
        <Users className="size-4" strokeWidth={2} />
        Personen
      </button>
      <button
        type="button"
        onClick={() => onChange("organizations")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          active === "organizations"
            ? "text-white"
            : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
        }`}
        style={
          active === "organizations" ? { background: "#042660" } : undefined
        }
      >
        <Building2 className="size-4" strokeWidth={2} />
        Organisaties
      </button>
    </div>
  );
}
