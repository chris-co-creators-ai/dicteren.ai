import Link from "next/link";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess } from "@/lib/auth/session";
import {
  funnelEventCounts,
  activationsLastNDays,
  commerceKpis,
  overviewKpis,
} from "@/lib/services/commerce";
import {
  getMrrArrSummary,
  getTrialConversionRate,
  getPipelineCounts,
  getAffiliateBusinessSummary,
  getTopAffiliates,
  getRevenueLastNDays,
  getRecentPaidOrders,
  getPastDueWatchlist,
  getEmailEngagement30d,
  getActiveSubBreakdown,
  getFunnelAnalytics,
} from "@/lib/services/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics · Admin" };

const FUNNEL_ORDER: { key: string; label: string }[] = [
  { key: "checkout_started", label: "Checkout gestart" },
  { key: "payment_completed", label: "Betaling voltooid" },
  { key: "audit.license.created", label: "Licentie aangemaakt" },
  { key: "audit.license.activated", label: "Licentie geactiveerd" },
];

const SOURCE_LABEL: Record<string, string> = {
  am_outreach: "AM-outreach",
  self_service: "Self-service",
  consumer_upgrade: "Consumer-upgrade",
  csv_import: "CSV-import",
  lead_form: "Lead-formulier",
};

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function eurDecimal(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
  });
}

export default async function AdminAnalyticsPage() {
  await assertStaffPageAccess("/admin/analytics");
  const [
    funnel,
    activations,
    kpis,
    overview,
    mrr,
    conversion,
    pipeline,
    affiliateBiz,
    topAffiliates,
    revenue30d,
    recentOrders,
    pastDue,
    emailStats,
    subBreakdown,
    gtmFunnel,
  ] = await Promise.all([
    funnelEventCounts(),
    activationsLastNDays(30),
    commerceKpis(),
    overviewKpis(),
    getMrrArrSummary(),
    getTrialConversionRate(),
    getPipelineCounts(),
    getAffiliateBusinessSummary(),
    getTopAffiliates(5),
    getRevenueLastNDays(30),
    getRecentPaidOrders(8),
    getPastDueWatchlist(5),
    getEmailEngagement30d(),
    getActiveSubBreakdown(),
    getFunnelAnalytics(),
  ]);

  const funnelSteps = FUNNEL_ORDER.map((s) => ({
    label: s.label,
    value: funnel.find((f) => f.eventType === s.key)?.count ?? 0,
  }));

  const activations30d = activations.reduce((s, d) => s + d.count, 0);
  const actMax = Math.max(1, ...activations.map((d) => d.count));
  const revenueMax = Math.max(1, ...revenue30d.map((d) => d.cents));
  const revenue30dTotal = revenue30d.reduce((s, d) => s + d.cents, 0);

  const pipelineStages: {
    key: keyof typeof pipeline;
    label: string;
    color: string;
  }[] = [
    { key: "lead", label: "Lead", color: "#6B7280" },
    { key: "prospect", label: "Prospect", color: "#3B82F6" },
    { key: "mql", label: "MQL", color: "#A855F7" },
    { key: "sql", label: "SQL", color: "#EAB308" },
    { key: "customer", label: "Klant", color: "#22C55E" },
  ];

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-6 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live SaaS-metrics uit subscriptions, orders, licenses,
            customer-attributes en affiliate-commissies. Geen externe
            analytics-bron.
          </p>
        </div>

        {/* HERO — Recurring revenue */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Recurring revenue
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label="MRR"
              value={eur(mrr.mrrCents)}
              detail={`${mrr.activeSubs} actieve subs`}
              accent
            />
            <KPI
              label="ARR (projectie)"
              value={eur(mrr.arrCents)}
              detail="MRR × 12"
            />
            <KPI
              label="Omzet 30d"
              value={eur(revenue30dTotal)}
              detail={`${eur(kpis.revenueCentsAllTime)} all-time`}
            />
            <KPI
              label="Past-due risico"
              value={eur(mrr.pastDueRevenueAtRiskCents)}
              detail={`${mrr.pastDueSubs} subs in grace-period`}
              warning={mrr.pastDueSubs > 0}
            />
          </div>
        </section>

        {/* Revenue chart 30d */}
        <section className="brand-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Omzet · laatste 30 dagen</h3>
            <span className="text-xs text-[color:var(--text-muted)]">
              {eur(revenue30dTotal)} totaal
            </span>
          </div>
          {revenue30dTotal === 0 ? (
            <div className="py-8 text-center text-sm text-[color:var(--text-muted)]">
              Geen betaalde orders in afgelopen 30 dagen.
            </div>
          ) : (
            <div className="flex items-end gap-1.5">
              {revenue30d.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${d.date}: ${eurDecimal(d.cents)}`}
                >
                  <div
                    className="flex h-28 w-full items-end"
                    style={{ background: "var(--bg)" }}
                  >
                    <div
                      className="w-full"
                      style={{
                        height: `${(d.cents / revenueMax) * 100}%`,
                        background: "var(--orange)",
                      }}
                    />
                  </div>
                  <div className="font-mono text-[0.5625rem] text-[color:var(--text-muted)]">
                    {d.date.slice(8, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Funnel + Pipeline KPI's */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Funnel & pipeline
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label="Trial → Paid"
              value={`${conversion.conversionPct}%`}
              detail={`${conversion.trialUsers} trials · ${conversion.paidUsers} paid users`}
            />
            <KPI
              label="Pipeline open"
              value={String(
                pipeline.lead +
                  pipeline.prospect +
                  pipeline.mql +
                  pipeline.sql,
              )}
              detail={`${pipeline.customer} klanten · ${pipeline.total} totaal`}
            />
            <KPI
              label="Activaties 30d"
              value={String(activations30d)}
              detail={`${overview.activationsToday} vandaag`}
            />
            <KPI
              label="Total users"
              value={String(conversion.totalUsers)}
              detail="Alle auth.user-records"
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="brand-card p-5">
            <h3 className="mb-4 text-sm font-bold">Checkout-funnel</h3>
            <div className="flex flex-col gap-3">
              {funnelSteps.map((s, i) => {
                const max = Math.max(1, funnelSteps[0].value);
                const pct = Math.round((s.value / max) * 100);
                const drop =
                  i > 0 && funnelSteps[i - 1].value > 0
                    ? Math.round(
                        ((funnelSteps[i - 1].value - s.value) /
                          funnelSteps[i - 1].value) *
                          100,
                      )
                    : 0;
                return (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold">{s.label}</span>
                      <span className="font-mono text-[color:var(--text-muted)]">
                        {s.value.toLocaleString("nl-NL")}
                        {i > 0 && drop > 0 && (
                          <span className="ml-2 text-[color:var(--orange)]">
                            −{drop}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-full"
                      style={{ background: "var(--bg-deep)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "var(--orange)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="brand-card p-5">
            <h3 className="mb-4 text-sm font-bold">
              CRM-pipeline · stage-verdeling
            </h3>
            {pipeline.total === 0 ? (
              <div className="py-8 text-center text-sm text-[color:var(--text-muted)]">
                Nog geen CRM-attributen ingesteld.{" "}
                <Link href="/admin/crm" className="underline">
                  Open CRM
                </Link>
                .
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pipelineStages.map((s) => {
                  const v = pipeline[s.key];
                  const pct =
                    pipeline.total > 0
                      ? Math.round((v / pipeline.total) * 100)
                      : 0;
                  return (
                    <div key={s.key as string}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: s.color }}
                          />
                          {s.label}
                        </span>
                        <span className="font-mono text-[color:var(--text-muted)]">
                          {v} · {pct}%
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ background: "var(--bg-deep)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: s.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* GTM-funnel · B2B-pijplijn */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            GTM-funnel · B2B-pijplijn
          </h2>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="brand-card p-4">
              <div className="text-xs text-[color:var(--text-muted)]">Win-rate</div>
              <div className="mt-1 text-xl font-bold">{gtmFunnel.winRatePct}%</div>
              <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                {gtmFunnel.wonCount} gewonnen · {gtmFunnel.lostCount} verloren
              </div>
            </div>
            <div className="brand-card p-4">
              <div className="text-xs text-[color:var(--text-muted)]">
                Conversie (lead→won)
              </div>
              <div className="mt-1 text-xl font-bold">
                {gtmFunnel.overallConversionPct}%
              </div>
              <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                {gtmFunnel.totalOrgs} organisaties totaal
              </div>
            </div>
            <div className="brand-card p-4">
              <div className="text-xs text-[color:var(--text-muted)]">
                Gem. sales-cyclus
              </div>
              <div className="mt-1 text-xl font-bold">
                {gtmFunnel.avgSalesCycleDays === null
                  ? "—"
                  : `${gtmFunnel.avgSalesCycleDays} dgn`}
              </div>
              <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                aanmaak → gewonnen
              </div>
            </div>
            <div className="brand-card p-4">
              <div className="text-xs text-[color:var(--text-muted)]">
                Gewogen forecast
              </div>
              <div className="mt-1 text-xl font-bold">
                {eur(gtmFunnel.weightedForecastCents)}
              </div>
              <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                open deals × kans-per-stage
              </div>
            </div>
          </div>

          {/* Bron-attributie: waar komt groei vandaan */}
          <div className="brand-card p-5">
            <h3 className="mb-3 text-sm font-bold">
              Bron-attributie · waar komt groei vandaan
            </h3>
            {gtmFunnel.sources.length === 0 ? (
              <div className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                Nog geen organisaties in de pijplijn.{" "}
                <Link href="/admin/crm" className="underline">
                  Voeg prospects toe
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[0.6875rem] uppercase text-[color:var(--text-muted)]">
                    <tr>
                      <th className="py-2 pr-4">Bron</th>
                      <th className="py-2 pr-4">Leads</th>
                      <th className="py-2 pr-4">Gewonnen</th>
                      <th className="py-2 pr-4">Win-rate</th>
                      <th className="py-2 pr-4">Open waarde</th>
                      <th className="py-2">Gewonnen waarde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gtmFunnel.sources.map((s) => (
                      <tr
                        key={s.source}
                        className="border-t border-[color:var(--border-soft)]"
                      >
                        <td className="py-2 pr-4 font-medium">
                          {SOURCE_LABEL[s.source] ?? s.source}
                        </td>
                        <td className="py-2 pr-4 font-mono">{s.total}</td>
                        <td className="py-2 pr-4 font-mono">{s.won}</td>
                        <td className="py-2 pr-4 font-mono">{s.winRatePct}%</td>
                        <td className="py-2 pr-4 font-mono">
                          {eur(s.openValueCents)}
                        </td>
                        <td className="py-2 font-mono">
                          {eur(s.wonValueCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Revenue-mix per plan */}
        <section className="brand-card p-5">
          <h3 className="mb-3 text-sm font-bold">
            Actieve subscriptions per plan
          </h3>
          {subBreakdown.length === 0 ? (
            <div className="py-6 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen actieve subscriptions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[0.6875rem] uppercase text-[color:var(--text-muted)]">
                  <tr>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Subs</th>
                    <th className="py-2 pr-4">MRR-bijdrage</th>
                    <th className="py-2">% van MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {subBreakdown.map((s) => {
                    const pct =
                      mrr.mrrCents > 0
                        ? Math.round((s.mrrCents / mrr.mrrCents) * 100)
                        : 0;
                    return (
                      <tr
                        key={s.planSlug}
                        className="border-t border-[color:var(--border-soft)]"
                      >
                        <td className="py-2 pr-4 font-medium">{s.planLabel}</td>
                        <td className="py-2 pr-4">{s.count}</td>
                        <td className="py-2 pr-4 font-mono">
                          {eurDecimal(s.mrrCents)}
                        </td>
                        <td className="py-2">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Affiliate business */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Affiliate business
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label="Resellers"
              value={String(affiliateBiz.affiliateCount)}
              detail={`${affiliateBiz.activeCount} actief · ${affiliateBiz.pendingCount} pending`}
            />
            <KPI
              label="Verdiende commissie"
              value={eur(affiliateBiz.totalEarnedCents)}
              detail="Lifetime cumulatief"
            />
            <KPI
              label="Openstaand"
              value={eur(affiliateBiz.outstandingCents)}
              detail={`${eur(affiliateBiz.payableCommissionCents)} payable · ${affiliateBiz.pendingCommissionCount} pending`}
              warning={affiliateBiz.payableCommissionCents > 0}
            />
            <KPI
              label="Uitbetaald"
              value={eur(affiliateBiz.totalPaidCents)}
              detail="Lifetime uitbetaald"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="brand-card p-5">
              <h3 className="mb-3 text-sm font-bold">
                Top affiliates (verdiend)
              </h3>
              {topAffiliates.length === 0 ? (
                <div className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                  Nog geen affiliates.
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--border-soft)]">
                  {topAffiliates.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between py-2"
                    >
                      <Link
                        href={`/admin/affiliates/${a.id}`}
                        className="flex flex-col"
                      >
                        <span className="text-sm font-semibold">{a.name}</span>
                        <span className="font-mono text-[0.6875rem] text-[color:var(--text-soft)]">
                          {a.code} · {a.status}
                        </span>
                      </Link>
                      <span className="font-mono text-sm font-bold">
                        {eurDecimal(a.totalEarnedCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="brand-card p-5">
              <h3 className="mb-3 text-sm font-bold">Past-due watchlist</h3>
              {pastDue.length === 0 ? (
                <div className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                  Geen subscriptions in past-due. ✓
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--border-soft)]">
                  {pastDue.map((p) => (
                    <li
                      key={p.subscriptionId}
                      className="flex items-center justify-between py-2"
                    >
                      <Link
                        href={
                          p.userId
                            ? `/admin/crm/${p.userId}`
                            : "/admin/orders"
                        }
                        className="flex flex-col"
                      >
                        <span className="text-sm font-semibold">
                          {p.customerName ?? p.customerEmail ?? "Onbekend"}
                        </span>
                        <span className="text-[0.6875rem] text-[color:var(--text-soft)]">
                          {p.planLabel} · {formatDate(p.nextBillingAt)}
                        </span>
                      </Link>
                      <span className="font-mono text-sm text-[color:var(--orange-600)]">
                        {eurDecimal(p.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Activity feed */}
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="brand-card p-5">
            <h3 className="mb-3 text-sm font-bold">Recente paid orders</h3>
            {recentOrders.length === 0 ? (
              <div className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                Nog geen betaalde orders.
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--border-soft)]">
                {recentOrders.map((o) => (
                  <li
                    key={o.orderId}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {o.customerName ?? o.customerEmail ?? "Onbekend"}
                      </div>
                      <div className="truncate text-[0.6875rem] text-[color:var(--text-soft)]">
                        {o.planLabel ?? o.planSlug ?? "—"} ·{" "}
                        {o.quantity > 1 ? `${o.quantity} seats · ` : ""}
                        {formatDate(o.paidAt)}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold">
                      {eurDecimal(o.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="brand-card p-5">
            <h3 className="mb-3 text-sm font-bold">Email engagement (30d)</h3>
            {emailStats.sent === 0 ? (
              <div className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                Geen emails in afgelopen 30 dagen.
              </div>
            ) : (
              <div className="grid gap-3">
                <Stat
                  label="Verstuurd"
                  value={String(emailStats.sent)}
                  detail={`${emailStats.delivered} bezorgd`}
                />
                <Stat
                  label="Open rate"
                  value={`${emailStats.openRatePct}%`}
                  detail={`${emailStats.opened} keer geopend`}
                />
                <Stat
                  label="Click rate"
                  value={`${emailStats.clickRatePct}%`}
                  detail={`${emailStats.clicked} clicks`}
                />
                {emailStats.bounced > 0 && (
                  <Stat
                    label="Bounce / klacht"
                    value={String(emailStats.bounced)}
                    detail="kritisch — bekijk in /admin/emails"
                    warning
                  />
                )}
              </div>
            )}
          </div>
        </section>

        {/* Activations 30d */}
        <section className="brand-card p-5">
          <h3 className="mb-4 text-sm font-bold">
            Licentie-activaties · laatste 30 dagen
          </h3>
          {activations30d === 0 ? (
            <div className="py-8 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen activaties geregistreerd.
            </div>
          ) : (
            <div className="flex items-end gap-1.5">
              {activations.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${d.date}: ${d.count}`}
                >
                  <div
                    className="flex h-28 w-full items-end"
                    style={{ background: "var(--bg)" }}
                  >
                    <div
                      className="w-full"
                      style={{
                        height: `${(d.count / actMax) * 100}%`,
                        background: "var(--navy-500)",
                      }}
                    />
                  </div>
                  <div className="font-mono text-[0.5625rem] text-[color:var(--text-muted)]">
                    {d.date.slice(8, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function KPI({
  label,
  value,
  detail,
  accent,
  warning,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`brand-card p-4 ${
        accent
          ? "ring-2 ring-[color:var(--orange)]"
          : warning
            ? "ring-2 ring-orange-200"
            : ""
      }`}
    >
      <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
        {detail}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  warning,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-[color:var(--text-muted)]">
          {label}
        </span>
        <span
          className={`text-lg font-bold ${
            warning ? "text-[color:var(--orange-600)]" : ""
          }`}
        >
          {value}
        </span>
      </div>
      <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
        {detail}
      </div>
    </div>
  );
}
