"use client";

import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  billingEmail: string | null;
  vatNumber: string | null;
  memberCount: number;
  licenseCount: number;
  createdAt: string;
};

type Kpi = { label: string; value: string; detail: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function OrganizationsView({
  organizations,
  kpis,
}: {
  organizations: Organization[];
  kpis: Kpi[];
}) {
  const [search, setSearch] = useState("");
  const filtered = organizations.filter(
    (o) => !search || o.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Organisaties
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live data uit Neon Auth · seats en facturatie uit organization_billing.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {kpi.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{kpi.value}</div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {kpi.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="brand-card overflow-hidden p-0">
          <div className="border-b border-[color:var(--border-soft)] p-4">
            <div className="relative w-full sm:w-80">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
                strokeWidth={2.2}
                style={{ color: "var(--text-soft)" }}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek organisatie…"
                className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                style={{ background: "var(--bg)" }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen organisaties.
            </div>
          ) : (
            <ul>
              {filtered.map((o, i) => (
                <li
                  key={o.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5",
                    i > 0 && "border-t border-[color:var(--border-soft)]",
                  )}
                >
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-2xl"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    <Building2
                      className="size-5"
                      strokeWidth={1.8}
                      style={{ color: "var(--navy)" }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{o.name}</h3>
                      {o.vatNumber && (
                        <span className="chip chip-navy gap-1.5 px-2 py-0.5 text-[0.625rem]">
                          {o.vatNumber}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
                      {o.billingEmail ?? "Geen factuur-email"} · aangemaakt {formatDate(o.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-6 text-[0.6875rem]">
                    <div>
                      <div className="text-[color:var(--text-muted)]">Members</div>
                      <div className="font-mono font-semibold">{o.memberCount}</div>
                    </div>
                    <div>
                      <div className="text-[color:var(--text-muted)]">Licenties</div>
                      <div className="font-mono font-semibold">{o.licenseCount}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
