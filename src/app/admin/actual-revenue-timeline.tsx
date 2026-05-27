// Server-rendered: werkelijke B2B-MRR per mijlpaal op basis van Mollie-data.
// Toont dezelfde 8 mijlpalen als de target-roadmap, maar dan met live cijfers
// uit `subscriptions` + `plans` (geaggregeerd via getActualB2BMrrTimeline).

import { TrendingUp } from "lucide-react";
import type { RevenuePoint } from "@/lib/services/revenueTimeline";

const MILESTONE_LABELS = [
  "Juni",
  "Juli",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
  "Jan 2027",
] as const;

function fmtEuro(cents: number, compact = false): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(cents / 100);
}

export function ActualRevenueTimeline({
  points,
  today,
}: {
  points: RevenuePoint[];
  today: Date;
}) {
  const latest = points[points.length - 1];
  const totalCustomers = latest?.customerCount ?? 0;
  const totalMrrCents = latest?.mrrCents ?? 0;

  return (
    <section
      className="rounded-2xl border bg-white p-5 sm:p-6"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="grid size-7 place-items-center rounded-lg"
              style={{ background: "var(--aqua-50)" }}
            >
              <TrendingUp
                className="size-4"
                style={{ color: "#042660" }}
                strokeWidth={2.2}
              />
            </span>
            <h2 className="text-base font-bold text-[color:var(--navy)]">
              Werkelijke MRR uit Mollie
            </h2>
          </div>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Per peil-datum: actieve zakelijke abonnementen + maandelijkse
            omzet, live uit de subscriptions-tabel.
          </p>
        </div>

        <div
          className="rounded-xl border px-4 py-2 text-right"
          style={{
            background: "var(--aqua-50)",
            borderColor: "var(--aqua-200)",
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--navy)]">
            Nu ({today.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })})
          </div>
          <div className="text-lg font-bold text-[color:var(--navy)]">
            {totalCustomers} klanten
          </div>
          <div className="text-[11px] text-[color:var(--text-muted)]">
            = {fmtEuro(totalMrrCents)} MRR
          </div>
        </div>
      </div>

      {/* Tijdlijn */}
      <div className="mt-6 overflow-x-auto">
        <div className="relative min-w-[680px] py-12">
          {/* Horizontale lijn */}
          <div
            className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--aqua-200) 0%, var(--aqua) 100%)",
            }}
          />

          {/* Mijlpalen */}
          <div className="relative flex justify-between">
            {points.map((p, i) => {
              const label = MILESTONE_LABELS[i] ?? "";
              const peilDate = new Date(p.date + "T00:00:00");
              const isPast = peilDate <= today;
              const isFuture = peilDate > today;
              return (
                <div
                  key={p.date}
                  className="flex w-20 flex-col items-center text-center"
                >
                  {/* Klanten boven lijn */}
                  <div
                    className={`mb-3 rounded-lg border px-2 py-1.5 text-center ${
                      isFuture ? "opacity-40" : ""
                    }`}
                    style={{
                      background: "white",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Klanten
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--navy)" }}
                    >
                      {isFuture ? "—" : p.customerCount.toLocaleString("nl-NL")}
                    </div>
                  </div>

                  {/* Maand-label boven lijn */}
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--navy)]">
                    {label}
                  </div>

                  {/* Bolletje */}
                  <div
                    className="size-3 rounded-full border-2 border-white shadow-md"
                    style={{
                      background: isFuture
                        ? "#cbd5e1"
                        : isPast
                          ? "#042660"
                          : "#8BE1E5",
                    }}
                  />

                  {/* MRR onder lijn */}
                  <div
                    className={`mt-3 rounded-lg border px-2 py-1.5 text-center ${
                      isFuture ? "opacity-40" : ""
                    }`}
                    style={{
                      background: "white",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      MRR
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--navy)" }}
                    >
                      {isFuture ? "—" : fmtEuro(p.mrrCents, true)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
        Toekomstige peil-datums worden ingevuld zodra ze gepasseerd zijn. Data
        komt direct uit Mollie via onze webhook-gespiegelde subscriptions-tabel.
      </p>
    </section>
  );
}
