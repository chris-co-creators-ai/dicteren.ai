"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Download,
  Filter,
  Search,
  User,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";

type Stage = "lead" | "trial_active" | "trial_expired" | "converted";
type Segment = "consumer" | "team" | "partner" | "trial" | "lead";

type Customer = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  createdAt: string;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  trialStatus: string | null;
  paidLicenseCount: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  stage: Stage;
  segment: Segment;
  licenseSource: string | null;
  discountType: string | null;
  discountValue: number | null;
  mollieCustomerId: string | null;
  subscriptionStatus: string | null;
  nextBillingAt: string | null;
  accountOwner: {
    affiliateId: string;
    code: string;
    name: string;
    convertedAt: string | null;
  } | null;
};

type AffiliateOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type Kpi = { label: string; value: string; detail: string };

type TabKey = "all" | Stage | `seg:${Segment}`;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "trial_active", label: "Trial actief" },
  { key: "trial_expired", label: "Trial verlopen" },
  { key: "converted", label: "Geconverteerd" },
  { key: "lead", label: "Lead" },
  { key: "seg:consumer", label: "Consumer" },
  { key: "seg:team", label: "Team" },
  { key: "seg:partner", label: "Partner" },
];

const STAGE_META: Record<
  Stage,
  { label: string; chipBg: string; chipFg: string }
> = {
  trial_active: {
    label: "Trial actief",
    chipBg: "color-mix(in srgb, var(--green) 12%, white)",
    chipFg: "var(--green)",
  },
  trial_expired: {
    label: "Trial verlopen",
    chipBg: "color-mix(in srgb, var(--orange) 12%, white)",
    chipFg: "var(--orange-600)",
  },
  converted: {
    label: "Converted",
    chipBg: "color-mix(in srgb, var(--navy) 12%, white)",
    chipFg: "var(--navy)",
  },
  lead: {
    label: "Lead",
    chipBg: "var(--surface-2)",
    chipFg: "var(--text-muted)",
  },
};

const SEGMENT_META: Record<
  Segment,
  { label: string; chipBg: string; chipFg: string }
> = {
  team: {
    label: "Team",
    chipBg: "color-mix(in srgb, var(--navy) 14%, white)",
    chipFg: "var(--navy)",
  },
  consumer: {
    label: "Consumer",
    chipBg: "color-mix(in srgb, var(--aqua) 18%, white)",
    chipFg: "var(--navy)",
  },
  partner: {
    label: "Partner",
    chipBg: "color-mix(in srgb, var(--orange) 14%, white)",
    chipFg: "var(--orange-600)",
  },
  trial: {
    label: "Trial",
    chipBg: "color-mix(in srgb, var(--green) 14%, white)",
    chipFg: "var(--green)",
  },
  lead: {
    label: "Lead",
    chipBg: "var(--surface-2)",
    chipFg: "var(--text-muted)",
  },
};

function formatDiscount(type: string | null, value: number | null): string | null {
  if (!type || value === null) return null;
  if (type === "free_months") return `${value} mnd gratis`;
  if (type === "lifetime") return "Lifetime gratis";
  if (type === "percentage") return `-${value}%`;
  if (type === "fixed") return `-€${(value / 100).toFixed(2)}`;
  return `${type}: ${value}`;
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
  affiliates,
  kpis,
  stageCounts,
}: {
  customers: Customer[];
  affiliates: AffiliateOption[];
  kpis: Kpi[];
  stageCounts: Record<Stage, number>;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  const counts: Record<TabKey, number> = useMemo(() => {
    const bySeg: Record<Segment, number> = {
      consumer: 0,
      team: 0,
      partner: 0,
      trial: 0,
      lead: 0,
    };
    for (const c of customers) bySeg[c.segment] += 1;
    return {
      all: customers.length,
      lead: stageCounts.lead,
      trial_active: stageCounts.trial_active,
      trial_expired: stageCounts.trial_expired,
      converted: stageCounts.converted,
      "seg:consumer": bySeg.consumer,
      "seg:team": bySeg.team,
      "seg:partner": bySeg.partner,
      "seg:trial": bySeg.trial,
      "seg:lead": bySeg.lead,
    };
  }, [customers, stageCounts]);

  const filtered = useMemo(
    () =>
      customers.filter((r) => {
        if (tab !== "all") {
          if (tab.startsWith("seg:")) {
            const seg = tab.slice(4) as Segment;
            if (r.segment !== seg) return false;
          } else if (r.stage !== tab) {
            return false;
          }
        }
        if (ownerFilter !== "all") {
          if (ownerFilter === "none") {
            if (r.accountOwner) return false;
          } else if (r.accountOwner?.affiliateId !== ownerFilter) {
            return false;
          }
        }
        if (search) {
          const q = search.toLowerCase();
          return (
            r.name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q) ||
            (r.mollieCustomerId?.toLowerCase().includes(q) ?? false) ||
            (r.accountOwner?.name.toLowerCase().includes(q) ?? false) ||
            (r.accountOwner?.code.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      }),
    [tab, search, ownerFilter, customers],
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
            Trial-funnel per klant: lead → trial → conversie. Klik op een rij voor de tijdlijn.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {kpi.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">
                {kpi.value}
              </div>
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
                  placeholder="Zoek naam, e-mail of partner…"
                  className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                  style={{ background: "var(--bg)" }}
                />
              </div>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="rounded-lg border border-[color:var(--border-soft)] py-2 px-3 text-sm outline-none focus:border-[color:var(--orange)]"
                style={{ background: "var(--bg)" }}
                title="Filter op account owner"
              >
                <option value="all">Alle account owners</option>
                <option value="none">Geen account owner</option>
                {affiliates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  {[
                    "Klant",
                    "Segment",
                    "Stage",
                    "Trial",
                    "Mollie",
                    "Discount / bron",
                    "Mails",
                    "Lic.",
                    "Lid sinds",
                    "Account owner",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      Geen klanten in dit filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const Icon = r.role === "admin" ? Building2 : User;
                    const stage = STAGE_META[r.stage];
                    const seg = SEGMENT_META[r.segment];
                    const discountLabel = formatDiscount(
                      r.discountType,
                      r.discountValue,
                    );
                    return (
                      <tr
                        key={r.id}
                        className="bg-white"
                        style={{ borderTop: "1px solid var(--border-soft)" }}
                      >
                        <td className="px-3 py-3">
                          <Link
                            href={`/admin/crm/${r.id}`}
                            className="flex items-center gap-3"
                          >
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
                                {!r.emailVerified && " · niet geverifieerd"}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold"
                            style={{
                              background: seg.chipBg,
                              color: seg.chipFg,
                            }}
                          >
                            {seg.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold"
                            style={{
                              background: stage.chipBg,
                              color: stage.chipFg,
                            }}
                          >
                            {stage.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {r.trialStartedAt ? (
                            <>
                              <div>start {formatDate(r.trialStartedAt)}</div>
                              {r.trialExpiresAt && (
                                <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                                  loopt tot {formatDate(r.trialExpiresAt)}
                                </div>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-[0.6875rem] text-[color:var(--text-muted)]">
                          {r.mollieCustomerId ? (
                            <>
                              <div className="truncate" style={{ maxWidth: 110 }}>
                                {r.mollieCustomerId}
                              </div>
                              {r.subscriptionStatus && (
                                <div className="text-[0.625rem] text-[color:var(--text-soft)]">
                                  sub {r.subscriptionStatus}
                                  {r.nextBillingAt
                                    ? ` · ${formatDate(r.nextBillingAt)}`
                                    : ""}
                                </div>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {discountLabel ? (
                            <div className="font-semibold text-[color:var(--orange-600)]">
                              {discountLabel}
                            </div>
                          ) : null}
                          <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                            {r.licenseSource ?? "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <div className="font-semibold">
                            {r.emailsSent} verstuurd
                          </div>
                          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                            {r.emailsOpened} geopend · {r.emailsClicked} geklikt
                            {r.emailsBounced > 0 ? ` · ${r.emailsBounced} bounce` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                          {r.paidLicenseCount}
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {r.accountOwner ? (
                            <Link
                              href={`/admin/affiliates/${r.accountOwner.affiliateId}`}
                              className="inline-flex flex-col"
                            >
                              <span className="font-semibold text-[color:var(--navy)]">
                                {r.accountOwner.name}
                              </span>
                              <span className="font-mono text-[0.625rem] text-[color:var(--text-soft)]">
                                {r.accountOwner.code}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-[color:var(--text-soft)]">—</span>
                          )}
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
    </>
  );
}
