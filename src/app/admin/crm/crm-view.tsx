"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  Filter,
  MoreHorizontal,
  Search,
  User,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  licenseCount: number;
  createdAt: string;
};

type Kpi = { label: string; value: string; detail: string };

type TabKey = "all" | "active" | "verified" | "lead" | "admin";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "active", label: "Met licentie" },
  { key: "verified", label: "Geverifieerd" },
  { key: "lead", label: "Zonder licentie" },
  { key: "admin", label: "Admin" },
];

function matches(c: Customer, key: TabKey): boolean {
  switch (key) {
    case "all":
      return true;
    case "active":
      return c.licenseCount > 0;
    case "verified":
      return c.emailVerified;
    case "lead":
      return c.licenseCount === 0;
    case "admin":
      return c.role === "admin";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CrmView({
  customers,
  kpis,
}: {
  customers: Customer[];
  kpis: Kpi[];
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<Customer | null>(null);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: customers.length,
      active: 0,
      verified: 0,
      lead: 0,
      admin: 0,
    };
    for (const k of Object.keys(c) as TabKey[]) {
      c[k] = customers.filter((cu) => matches(cu, k)).length;
    }
    return c;
  }, [customers]);

  const filtered = useMemo(
    () =>
      customers.filter((r) => {
        if (!matches(r, tab)) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tab, search, customers],
  );

  return (
    <>
      <AdminTopbar
        actions={
          <button className="btn btn-secondary btn-sm">
            <Download className="size-3" strokeWidth={2.2} />
            Exporteer CSV
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            CRM
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live klantenbestand uit Neon Auth · licentie-koppeling per gebruiker.
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
          <div className="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    tab === t.key
                      ? "bg-[color:var(--bg-deep)] font-bold text-[color:var(--navy)]"
                      : "font-medium text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.625rem]",
                      tab === t.key
                        ? "bg-white text-[color:var(--text-muted)]"
                        : "bg-[color:var(--bg-deep)] text-[color:var(--text-muted)]",
                    )}
                  >
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
                  strokeWidth={2.2}
                  style={{ color: "var(--text-soft)" }}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek naam of e-mail…"
                  className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                  style={{ background: "var(--bg)" }}
                />
              </div>
              <button className="btn btn-secondary btn-sm hidden sm:inline-flex">
                <Filter className="size-3" strokeWidth={2.2} />
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  {["Klant", "Rol", "Licenties", "Status", "Lid sinds"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-14 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]">
                      Nog geen klanten.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const Icon = r.role === "admin" ? Building2 : User;
                    const statusChip = r.emailVerified ? "chip-green" : "chip-orange";
                    const statusDot = r.emailVerified ? "var(--green)" : "var(--orange)";
                    const statusLabel = r.emailVerified ? "Geverifieerd" : "Niet geverifieerd";
                    return (
                      <tr
                        key={r.id}
                        className="bg-white"
                        style={{ borderTop: "1px solid var(--border-soft)" }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-full"
                              style={{ background: "var(--bg-deep)" }}
                            >
                              <Icon
                                className="size-4"
                                strokeWidth={1.8}
                                style={{ color: "var(--navy)" }}
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {r.name}
                              </div>
                              <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                                {r.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          className="px-3 py-3 text-xs font-semibold"
                          style={{ color: r.role === "admin" ? "var(--orange-600)" : "var(--navy-500)" }}
                        >
                          {r.role ?? "user"}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                          {r.licenseCount}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`chip ${statusChip} gap-1.5 px-2 py-0.5 text-[0.625rem]`}
                          >
                            <span
                              aria-hidden
                              className="inline-block size-1.5 rounded-full"
                              style={{ background: statusDot }}
                            />
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setDrawer(r)}
                            aria-label="Opties"
                            className="rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                          >
                            <MoreHorizontal className="size-4" strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            <span>
              1–{filtered.length} van {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {drawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setDrawer(null)}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[color:var(--border-soft)] bg-white"
            style={{ boxShadow: "-0.75rem 0 2rem rgba(4, 38, 96, 0.10)" }}
          >
            <div className="flex items-center border-b border-[color:var(--border-soft)] px-5 py-4">
              <div className="min-w-0">
                <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                  {drawer.role ?? "user"}
                </div>
                <div className="truncate text-sm font-bold">{drawer.name}</div>
              </div>
              <button
                onClick={() => setDrawer(null)}
                aria-label="Sluit drawer"
                className="ml-auto rounded p-1.5 hover:bg-[color:var(--bg-deep)]"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["E-mail", drawer.email],
                  ["Verifieerd", drawer.emailVerified ? "Ja" : "Nee"],
                  ["Licenties", String(drawer.licenseCount)],
                  ["Rol", drawer.role ?? "user"],
                  ["Lid sinds", formatDate(drawer.createdAt)],
                  ["User ID", drawer.id.slice(0, 8) + "…"],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="rounded-xl p-3"
                    style={{ background: "var(--bg)" }}
                  >
                    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-soft)]">
                      {l}
                    </div>
                    <div className="mt-1 text-sm">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[color:var(--border-soft)] p-4">
              <a
                href={`mailto:${drawer.email}`}
                className="btn btn-secondary btn-sm justify-center"
              >
                E-mail sturen
              </a>
              <button className="btn btn-secondary btn-sm">Bekijk licenties</button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
