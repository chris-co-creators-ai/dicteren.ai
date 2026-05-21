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
import {
  ACTIVATIONS_14D,
  LICENSE_DISTRIBUTION,
  OVERVIEW_KPIS,
  RECENT_ACTIVITY,
  type ActivityItem,
} from "@/lib/mock/admin";

const ACTIVITY_ICON: Record<ActivityItem["type"], { icon: typeof Key; color: string }> =
  {
    license: { icon: Key, color: "var(--green)" },
    model: { icon: Download, color: "var(--navy-500)" },
    request: { icon: Users, color: "var(--orange)" },
    ticket: { icon: Bell, color: "var(--red)" },
    invoice: { icon: Receipt, color: "var(--green)" },
  };

function trendIcon(trend: "up" | "down" | "flat") {
  if (trend === "up") return ArrowUpRight;
  if (trend === "down") return ArrowDownRight;
  return Minus;
}

function trendColor(trend: "up" | "down" | "flat", demo?: boolean) {
  if (demo) return "var(--text-muted)";
  if (trend === "up") return "var(--green)";
  if (trend === "down") return "var(--orange)";
  return "var(--navy-500)";
}

export default function AdminOverviewPage() {
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
            Goedemorgen, Christian
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            21 mei 2026 · 8 nieuwe activaties sinds gisteren.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {OVERVIEW_KPIS.map((kpi) => {
            const TrendIcon = trendIcon(kpi.trend);
            const color = trendColor(kpi.trend, kpi.demo);
            return (
              <div key={kpi.label} className="brand-card relative p-4">
                {kpi.demo && (
                  <span
                    className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-[0.05em]"
                    style={{
                      background: "#fdecec",
                      color: "#b8323a",
                    }}
                  >
                    DEMO
                  </span>
                )}
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

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Activations chart */}
          <div className="brand-card p-5">
            <div className="mb-4 flex items-center">
              <h3 className="text-sm font-bold">
                Activaties · laatste 14 dagen
              </h3>
              <div className="ml-auto flex gap-1">
                {(["7d", "14d", "30d", "90d"] as const).map((p, i) => (
                  <button
                    key={p}
                    className={`rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors ${
                      i === 1
                        ? "bg-[color:var(--navy)] text-white"
                        : "border border-[color:var(--border-soft)] text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <ActivationsChart />
          </div>

          {/* License distribution */}
          <div className="brand-card p-5">
            <h3 className="mb-4 text-sm font-bold">Verdeling licentietype</h3>
            <div className="flex flex-col gap-3.5">
              {LICENSE_DISTRIBUTION.map((d) => (
                <div key={d.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block size-2 rounded-sm"
                        style={{ background: d.color }}
                      />
                      {d.label}
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
                      style={{ width: `${d.pct}%`, background: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-[color:var(--border-soft)] pt-3.5 text-[0.6875rem] text-[color:var(--text-soft)]">
              Op basis van 198 actieve licenties.
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="brand-card overflow-hidden p-0">
          <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
            <h3 className="text-sm font-bold">Recente activiteit</h3>
            <button className="ml-auto text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]">
              Alles bekijken
            </button>
          </div>
          <ul>
            {RECENT_ACTIVITY.map((a, i) => {
              const { icon: Icon, color } = ACTIVITY_ICON[a.type];
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
                    <Icon
                      className="size-3.5"
                      strokeWidth={2}
                      style={{ color }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {a.title}
                    </div>
                    <div
                      className="truncate text-[0.6875rem] text-[color:var(--text-muted)]"
                      style={
                        a.detailMono
                          ? { fontFamily: "var(--font-mono)" }
                          : undefined
                      }
                    >
                      {a.detail}
                    </div>
                  </div>
                  <div className="shrink-0 text-[0.6875rem] text-[color:var(--text-soft)]">
                    {a.ago}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

function ActivationsChart() {
  const data = ACTIVATIONS_14D;
  const width = 600;
  const height = 180;
  const padX = 20;
  const padY = 25;
  const max = Math.max(...data);
  const stepX = (width - padX * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = height - padY - ((height - padY * 2) * v) / max;
    return [x, y] as const;
  });
  const path =
    "M " +
    points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const area =
    path +
    ` L ${points.at(-1)![0]} ${height - padY} L ${points[0][0]} ${height - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-44 w-full"
      role="img"
      aria-label="Activaties laatste 14 dagen, oplopende trend"
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
