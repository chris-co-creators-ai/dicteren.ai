"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users } from "lucide-react";

export function CrmTabs() {
  const pathname = usePathname();
  const isOrgs = pathname?.startsWith("/admin/crm/organizations");
  return (
    <div
      className="-mt-2 mb-4 inline-flex items-center gap-1 rounded-lg border bg-white p-1 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <Link
        href="/admin/crm"
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          !isOrgs
            ? "bg-[color:var(--navy)] text-white"
            : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
        }`}
      >
        <Users className="size-4" strokeWidth={2} />
        Personen
      </Link>
      <Link
        href="/admin/crm/organizations"
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          isOrgs
            ? "bg-[color:var(--navy)] text-white"
            : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
        }`}
      >
        <Building2 className="size-4" strokeWidth={2} />
        Organisaties
      </Link>
    </div>
  );
}
