"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Search, AlertTriangle, ChevronRight } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { deriveCustomerSource } from "@/lib/services/customerSource";
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
  crmSource:
    | "am_outreach"
    | "self_service"
    | "consumer_upgrade"
    | "csv_import"
    | "lead_form"
    | "reseller_recruitment"
    | null;
  createdAt: string;
  totalSeats: number;
  assignedSeats: number;
  pendingSeats: number;
  unassignedFreeSeats: number;
  activeDevicesTotal: number;
  maxDevicesTotal: number;
  utilizationPct: number;
  tierId: string;
  tierDiscountPct: number;
  annualCents: number;
  subscriptionStatus: string | null;
  nextBillingAt: string | null;
};

type Kpi = { label: string; value: string; detail: string };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function tierLabel(id: string): string {
  switch (id) {
    case "tier_1_4": return "1-4";
    case "tier_5_9": return "5-9 (10%)";
    case "tier_10_24": return "10-24 (15%)";
    case "tier_25_49": return "25-49 (20%)";
    case "tier_custom": return "maatwerk";
    default: return id;
  }
}

export function OrganizationsView({
  organizations,
  kpis,
}: {
  organizations: Organization[];
  kpis: Kpi[];
}) {
  const [search, setSearch] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);

  const filtered = organizations.filter((o) => {
    if (showAlerts && o.utilizationPct < 100) return false;
    if (!search) return true;
    return o.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Organisaties
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live seat-data uit licenses + organization_billing.
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
          <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--border-soft)] p-4">
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
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
              <input
                type="checkbox"
                checked={showAlerts}
                onChange={(e) => setShowAlerts(e.target.checked)}
              />
              <AlertTriangle className="size-3.5" />
              Alleen alerts (100% bezet)
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]">
              {showAlerts
                ? "Geen orgs met alerts."
                : "Geen organisaties die matchen."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-soft)] bg-[color:var(--bg)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                    <th className="px-4 py-3">Organisatie</th>
                    <th className="px-4 py-3">Bron</th>
                    <th className="px-4 py-3 text-center">Seats</th>
                    <th className="px-4 py-3 text-center">Apparaten</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3 text-right">MRR</th>
                    <th className="px-4 py-3">Volgende incasso</th>
                    <th className="px-4 py-3">Alerts</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const monthly = Math.round(o.annualCents / 12);
                    const alerts: string[] = [];
                    if (o.utilizationPct >= 100) alerts.push("100% bezet");
                    if (o.subscriptionStatus === "past_due") {
                      alerts.push("past-due");
                    }
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-[color:var(--border-soft)] last:border-b-0 hover:bg-[color:var(--bg)]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/organizations/${o.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-xl"
                              style={{ background: "var(--bg-deep)" }}
                            >
                              <Building2
                                className="size-4"
                                strokeWidth={1.8}
                                style={{ color: "var(--navy)" }}
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold">{o.name}</div>
                              <div className="text-[11px] text-[color:var(--text-muted)]">
                                {o.billingEmail ?? "geen factuur-email"} ·{" "}
                                {formatDate(o.createdAt)}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const src = deriveCustomerSource({
                              crmOrgSource: o.crmSource,
                              licenseType: "team",
                            });
                            return <SourceBadge source={src.key} detail={src.detail} />;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          {o.assignedSeats} / {o.totalSeats}
                          {o.pendingSeats > 0 && (
                            <div className="text-[10px] text-[color:var(--orange-600)]">
                              {o.pendingSeats} pending
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          {o.activeDevicesTotal} / {o.maxDevicesTotal}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {tierLabel(o.tierId)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {eur(monthly)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatDate(o.nextBillingAt)}
                          {o.subscriptionStatus && (
                            <div
                              className={cn(
                                "text-[10px]",
                                o.subscriptionStatus === "active"
                                  ? "text-[color:var(--text-muted)]"
                                  : "text-red-700",
                              )}
                            >
                              {o.subscriptionStatus}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {alerts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {alerts.map((a) => (
                                <span
                                  key={a}
                                  className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[color:var(--text-soft)]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-2">
                          <Link
                            href={`/admin/organizations/${o.id}`}
                            className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
