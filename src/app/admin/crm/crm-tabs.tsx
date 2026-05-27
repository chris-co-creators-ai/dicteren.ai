"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Users } from "lucide-react";

export function CrmTabs() {
  const sp = useSearchParams();
  const tab = sp.get("tab");
  const isOrgs = tab === "organizations";
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border bg-white p-1 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <Link
        href="/admin/crm"
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          !isOrgs
            ? "text-white"
            : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
        }`}
        style={!isOrgs ? { background: "#042660" } : undefined}
      >
        <Users className="size-4" strokeWidth={2} />
        Personen
      </Link>
      <Link
        href="/admin/crm?tab=organizations"
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          isOrgs
            ? "text-white"
            : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
        }`}
        style={isOrgs ? { background: "#042660" } : undefined}
      >
        <Building2 className="size-4" strokeWidth={2} />
        Organisaties
      </Link>
    </div>
  );
}
