import { AdminTopbar } from "@/components/admin/admin-topbar";
import {
  funnelEventCounts,
  activationsLastNDays,
  commerceKpis,
  overviewKpis,
} from "@/lib/services/commerce";
import { formatMollieAmount } from "@/lib/services/mollie";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics · Admin" };

const FUNNEL_ORDER: { key: string; label: string }[] = [
  { key: "checkout_started", label: "Checkout gestart" },
  { key: "payment_completed", label: "Betaling voltooid" },
  { key: "audit.license.created", label: "Licentie aangemaakt" },
  { key: "audit.license.activated", label: "Licentie geactiveerd" },
];

export default async function AdminAnalyticsPage() {
  const [funnel, activations, kpis, overview] = await Promise.all([
    funnelEventCounts(),
    activationsLastNDays(30),
    commerceKpis(),
    overviewKpis(),
  ]);

  const funnelSteps = FUNNEL_ORDER.map((s) => ({
    label: s.label,
    value: funnel.find((f) => f.eventType === s.key)?.count ?? 0,
  }));
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));

  const totalEvents = funnel.reduce((s, e) => s + e.count, 0);
  const activations30d = activations.reduce((s, d) => s + d.count, 0);
  const conversionPct =
    funnelSteps[0].value > 0
      ? Math.round((funnelSteps[1].value / funnelSteps[0].value) * 100)
      : 0;

  const adminKpis = [
    {
      label: "Events totaal",
      value: totalEvents.toLocaleString("nl-NL"),
      delta: "Live uit events-tabel",
    },
    {
      label: "Checkout → Betaald",
      value: `${conversionPct}%`,
      delta: `${funnelSteps[0].value} starts · ${funnelSteps[1].value} paid`,
    },
    {
      label: "Activaties 30d",
      value: String(activations30d),
      delta: `${overview.activationsToday} vandaag`,
    },
    {
      label: "Omzet 30d",
      value: formatMollieAmount(kpis.revenueCents30d),
      delta: `${formatMollieAmount(kpis.revenueCentsAllTime)} totaal`,
    },
  ];

  const recentTypes = funnel.slice(0, 8);

  // Build sparkline bars from activations array
  const actMax = Math.max(1, ...activations.map((d) => d.count));

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">Analytics</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live uit events- en license_activations-tabel. Geen externe analytics-bron.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {adminKpis.map((k) => (
            <div key={k.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{k.value}</div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {k.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="brand-card p-5">
            <h3 className="mb-4 text-sm font-bold">Checkout-funnel</h3>
            <div className="flex flex-col gap-3">
              {funnelSteps.map((s, i) => {
                const pct = Math.round((s.value / funnelMax) * 100);
                const drop =
                  i > 0 && funnelSteps[i - 1].value > 0
                    ? Math.round(
                        ((funnelSteps[i - 1].value - s.value) / funnelSteps[i - 1].value) * 100,
                      )
                    : 0;
                return (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold">{s.label}</span>
                      <span className="font-mono text-[color:var(--text-muted)]">
                        {s.value.toLocaleString("nl-NL")}
                        {i > 0 && drop > 0 && (
                          <span className="ml-2 text-[color:var(--orange)]">−{drop}%</span>
                        )}
                      </span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-full"
                      style={{ background: "var(--bg-deep)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "var(--orange)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="brand-card p-5">
            <h3 className="mb-4 text-sm font-bold">Top event-types</h3>
            <div className="flex flex-col gap-3">
              {recentTypes.length === 0 ? (
                <div className="text-sm text-[color:var(--text-muted)]">
                  Nog geen events.
                </div>
              ) : (
                recentTypes.map((e) => {
                  const pct = totalEvents
                    ? Math.round((e.count / totalEvents) * 100)
                    : 0;
                  return (
                    <div key={e.eventType}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-mono">{e.eventType}</span>
                        <span className="font-mono font-semibold text-[color:var(--text-muted)]">
                          {e.count}
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "var(--bg-deep)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: "var(--aqua)" }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="brand-card p-5">
          <h3 className="mb-4 text-sm font-bold">Activaties · laatste 30 dagen</h3>
          {activations30d === 0 ? (
            <div className="py-8 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen activaties geregistreerd.
            </div>
          ) : (
            <div className="flex items-end gap-1.5">
              {activations.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
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
                  <div
                    className="font-mono text-[0.5625rem] text-[color:var(--text-muted)]"
                    title={d.date}
                  >
                    {d.date.slice(8, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
