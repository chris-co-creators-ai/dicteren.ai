import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Download,
  Key,
  Minus,
  Plus,
  Receipt,
  Upload,
  Users,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { getSession } from "@/lib/auth/session";
import {
  overviewKpis,
  licenseDistribution,
  activationsLastNDays,
  listRecentActivity,
} from "@/lib/services/commerce";
import { formatMollieAmount } from "@/lib/services/mollie";
import { listOpenPartnerTasks } from "@/lib/services/partnerTasks";
import { OpenTasksWidget } from "./open-tasks-widget";
import { RevenueRoadmap } from "./revenue-roadmap";
import { ActualRevenueTimeline } from "./actual-revenue-timeline";
import { getActualB2BMrrTimeline } from "@/lib/services/revenueTimeline";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  beta: "Beta (gratis)",
  consumer: "Persoonlijk",
  team: "Zakelijk",
};

const TYPE_COLOR: Record<string, string> = {
  beta: "var(--aqua)",
  consumer: "var(--orange)",
  team: "var(--navy)",
};

const ACTIVITY_ICON: Record<string, { icon: typeof Key; color: string }> = {
  license: { icon: Key, color: "var(--green)" },
  payment: { icon: Receipt, color: "var(--green)" },
  order: { icon: Receipt, color: "var(--navy-500)" },
  checkout: { icon: Receipt, color: "var(--orange)" },
  default: { icon: Bell, color: "var(--text-muted)" },
};

function iconFor(eventType: string) {
  if (eventType.includes("license")) return ACTIVITY_ICON.license;
  if (eventType.includes("payment")) return ACTIVITY_ICON.payment;
  if (eventType.includes("order")) return ACTIVITY_ICON.order;
  if (eventType.includes("checkout")) return ACTIVITY_ICON.checkout;
  return ACTIVITY_ICON.default;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Net";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} u`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function trendIcon(trend: "up" | "down" | "flat") {
  if (trend === "up") return ArrowUpRight;
  if (trend === "down") return ArrowDownRight;
  return Minus;
}

function trendColor(trend: "up" | "down" | "flat") {
  if (trend === "up") return "var(--green)";
  if (trend === "down") return "var(--orange)";
  return "var(--navy-500)";
}

function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    "audit.license.created": "Licentie aangemaakt",
    "audit.license.activated": "Licentie geactiveerd",
    "audit.order.paid": "Betaling ontvangen",
    "audit.order.failed": "Betaling mislukt",
    "audit.order.refunded": "Restitutie verwerkt",
    checkout_started: "Checkout gestart",
    payment_completed: "Betaling voltooid",
  };
  return labels[eventType] ?? eventType.replace(/^audit\./, "");
}

const ROADMAP_DATES = [
  new Date("2026-06-01T00:00:00Z"),
  new Date("2026-07-01T00:00:00Z"),
  new Date("2026-08-01T00:00:00Z"),
  new Date("2026-09-01T00:00:00Z"),
  new Date("2026-10-01T00:00:00Z"),
  new Date("2026-11-01T00:00:00Z"),
  new Date("2026-12-01T00:00:00Z"),
  new Date("2027-01-01T00:00:00Z"),
];

export default async function AdminOverviewPage() {
  const [session, kpis, distribution, activations, activity, openTasks, actualMrr] =
    await Promise.all([
      getSession(),
      overviewKpis(),
      licenseDistribution(),
      activationsLastNDays(14),
      listRecentActivity(8),
      listOpenPartnerTasks(20),
      getActualB2BMrrTimeline(ROADMAP_DATES),
    ]);

  const greetingName = session?.user.name?.split(" ")[0] ?? "Christian";
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Goedemorgen" : now.getHours() < 18 ? "Goedemiddag" : "Goedenavond";

  const overviewKpiCards: {
    label: string;
    value: string;
    delta: string;
    trend: "up" | "down" | "flat";
  }[] = [
    {
      label: "Actieve licenties",
      value: kpis.activeLicenses.toLocaleString("nl-NL"),
      delta: `${kpis.expiringSoon} verlopen < 30 dagen`,
      trend: kpis.expiringSoon > 5 ? "down" : "flat",
    },
    {
      label: "Beta-codes",
      value: kpis.betaCodes.toLocaleString("nl-NL"),
      delta: "Type=beta in DB",
      trend: "flat",
    },
    {
      label: "Activaties vandaag",
      value: String(kpis.activationsToday),
      delta: `${kpis.activationsLast24h} laatste 24u`,
      trend: kpis.activationsToday > 0 ? "up" : "flat",
    },
    {
      label: "Open orders",
      value: String(kpis.openOrders),
      delta: kpis.openOrders ? "Pending Mollie-betaling" : "Allemaal verwerkt",
      trend: kpis.openOrders > 0 ? "down" : "up",
    },
    {
      label: "Omzet 30d",
      value: formatMollieAmount(kpis.revenueCents30d),
      delta: `${formatMollieAmount(kpis.revenueCentsAllTime)} totaal`,
      trend: kpis.revenueCents30d > 0 ? "up" : "flat",
    },
    {
      label: "Klanten",
      value: String(activity.length),
      delta: "Recente events",
      trend: "flat",
    },
  ];

  return (
    <>
      <AdminTopbar
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <Upload className="size-3" strokeWidth={2.2} />
              Exporteren
            </button>
            <button className="btn btn-primary btn-sm">
              <Plus className="size-3" strokeWidth={2.4} />
              Nieuwe code
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            {greeting}, {greetingName}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {new Date().toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {kpis.activationsLast24h} activaties laatste 24 uur.
          </p>
        </div>

        <RevenueRoadmap />
        <ActualRevenueTimeline points={actualMrr} today={now} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {overviewKpiCards.map((kpi) => {
            const TrendIcon = trendIcon(kpi.trend);
            const color = trendColor(kpi.trend);
            return (
              <div key={kpi.label} className="brand-card relative p-4">
                <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                  {kpi.label}
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-[1.625rem]">
                  {kpi.value}
                </div>
                <div
                  className="mt-1.5 inline-flex items-center gap-1 text-[0.6875rem]"
                  style={{ color }}
                >
                  <TrendIcon className="size-2.5" strokeWidth={2.4} />
                  {kpi.delta}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="brand-card p-5">
            <div className="mb-4 flex items-center">
              <h3 className="text-sm font-bold">Activaties · laatste 14 dagen</h3>
            </div>
            <ActivationsChart data={activations.map((d) => d.count)} />
          </div>

          <div className="brand-card p-5">
            <h3 className="mb-4 text-sm font-bold">Verdeling licentietype</h3>
            <div className="flex flex-col gap-3.5">
              {distribution.map((d) => (
                <div key={d.type}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block size-2 rounded-sm"
                        style={{ background: TYPE_COLOR[d.type] }}
                      />
                      {TYPE_LABEL[d.type] ?? d.type}
                    </span>
                    <span className="font-semibold text-[color:var(--text-muted)]">
                      {d.pct}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${d.pct}%`,
                        background: TYPE_COLOR[d.type],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-[color:var(--border-soft)] pt-3.5 text-[0.6875rem] text-[color:var(--text-soft)]">
              Op basis van {distribution.reduce((s, d) => s + d.count, 0)} licenties.
            </div>
          </div>
        </div>

        <OpenTasksWidget
          initialTasks={openTasks.map((t) => ({
            id: t.id,
            partnerOrgId: t.partnerOrgId,
            organizationName: t.organizationName,
            externalId: t.externalId,
            accountOwner: t.accountOwner,
            title: t.title,
            kind: t.kind,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            notes: t.notes,
          }))}
        />

        <div className="brand-card overflow-hidden p-0">
          <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
            <h3 className="text-sm font-bold">Recente activiteit</h3>
            <a
              href="/admin/settings"
              className="ml-auto text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
            >
              Audit-log
            </a>
          </div>
          {activity.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen events vastgelegd.
            </div>
          ) : (
            <ul>
              {activity.map((a, i) => {
                const { icon: Icon, color } = iconFor(a.eventType);
                const props = a.properties as {
                  entityId?: string;
                  amountCents?: number;
                  paymentId?: string;
                };
                const detail = [
                  a.userEmail,
                  props.entityId ? `id ${props.entityId.slice(0, 8)}…` : null,
                  typeof props.amountCents === "number"
                    ? formatMollieAmount(props.amountCents)
                    : null,
                  props.paymentId,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li
                    key={a.id}
                    className={`flex items-center gap-3 p-3.5 ${
                      i > 0 ? "border-t border-[color:var(--border-soft)]" : ""
                    }`}
                  >
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-lg"
                      style={{ background: "var(--bg)" }}
                    >
                      <Icon className="size-3.5" strokeWidth={2} style={{ color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {eventLabel(a.eventType)}
                      </div>
                      <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                        {detail || "—"}
                      </div>
                    </div>
                    <div className="shrink-0 text-[0.6875rem] text-[color:var(--text-soft)]">
                      {relativeTime(a.occurredAt)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function ActivationsChart({ data }: { data: number[] }) {
  if (data.length === 0 || data.every((v) => v === 0)) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-[color:var(--text-muted)]">
        Nog geen activaties geregistreerd.
      </div>
    );
  }
  const width = 600;
  const height = 180;
  const padX = 20;
  const padY = 25;
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = height - padY - ((height - padY * 2) * v) / max;
    return [x, y] as const;
  });
  const path =
    "M " + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const area =
    path +
    ` L ${points.at(-1)![0]} ${height - padY} L ${points[0][0]} ${height - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-44 w-full"
      role="img"
      aria-label="Activaties laatste 14 dagen"
    >
      <defs>
        <linearGradient id="activations-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={padX}
          x2={width - padX}
          y1={i * 45 + 10}
          y2={i * 45 + 10}
          stroke="#E6EEF8"
        />
      ))}
      <path d={area} fill="url(#activations-fill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--orange)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx={points.at(-1)![0]}
        cy={points.at(-1)![1]}
        r="4"
        fill="var(--orange)"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}
