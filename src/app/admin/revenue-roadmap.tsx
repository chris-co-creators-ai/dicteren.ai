"use client";

// Doel-roadmap voor zakelijke MRR-groei van 01-06-2026 tot 01-01-2027.
// Doel-MRR: €80k per maand op 01-01-2027.
// Switch tussen seat-packages (5/10/15/20) toont per maand:
//   - aantal zakelijke klanten cumulatief
//   - MRR-target (lineaire ramp van €0 naar €80k over 7 maanden)

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { getTierForSeats } from "@/lib/services/pricingTiers";

const PACKAGES = [5, 10, 15, 20] as const;
type SeatPkg = (typeof PACKAGES)[number];

const MILESTONES = [
  { date: "2026-06-01", label: "Juni" },
  { date: "2026-07-01", label: "Juli" },
  { date: "2026-08-01", label: "Aug" },
  { date: "2026-09-01", label: "Sep" },
  { date: "2026-10-01", label: "Okt" },
  { date: "2026-11-01", label: "Nov" },
  { date: "2026-12-01", label: "Dec" },
  { date: "2027-01-01", label: "Jan 2027" },
] as const;

const TARGET_MRR_CENTS = 8_000_000; // €80.000

function fmtEuro(cents: number, compact = false): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(cents / 100);
}

function monthlyPerCustomerCents(seats: SeatPkg): number {
  const tier = getTierForSeats(seats);
  // pricePerSeatCents is jaarprijs per seat. Maand = / 12.
  return Math.round((tier.pricePerSeatCents * seats) / 12);
}

export function RevenueRoadmap() {
  const [pkg, setPkg] = useState<SeatPkg>(10);

  const perCustomer = useMemo(() => monthlyPerCustomerCents(pkg), [pkg]);

  const points = useMemo(() => {
    // Lineaire ramp: maand 0 = €0, maand 7 = €80k.
    const stepCents = TARGET_MRR_CENTS / (MILESTONES.length - 1);
    return MILESTONES.map((m, i) => {
      const mrrCents = Math.round(stepCents * i);
      const customers = perCustomer > 0 ? Math.ceil(mrrCents / perCustomer) : 0;
      return {
        ...m,
        mrrCents,
        customers,
        isStart: i === 0,
        isEnd: i === MILESTONES.length - 1,
      };
    });
  }, [perCustomer]);

  const finalCustomers = points[points.length - 1].customers;

  return (
    <section
      className="rounded-2xl border bg-white p-5 sm:p-6"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="grid size-7 place-items-center rounded-lg"
              style={{ background: "#FFE9D9" }}
            >
              <Target
                className="size-4"
                style={{ color: "#9A3412" }}
                strokeWidth={2.2}
              />
            </span>
            <h2 className="text-base font-bold text-[color:var(--navy)]">
              Roadmap naar €80k MRR
            </h2>
          </div>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Lineaire groei van 01-06-2026 tot 01-01-2027. Wissel het
            seat-package om te zien hoeveel zakelijke klanten je nodig hebt.
          </p>
        </div>

        {/* Eindtarget chip */}
        <div
          className="rounded-xl border px-4 py-2 text-right"
          style={{ background: "#FFF7ED", borderColor: "#FDBA74" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#9A3412]">
            01-01-2027
          </div>
          <div className="text-lg font-bold text-[#9A3412]">
            {finalCustomers} klanten
          </div>
          <div className="text-[11px] text-[#9A3412]">
            = €80k MRR ({fmtEuro(perCustomer)}/klant/maand)
          </div>
        </div>
      </div>

      {/* Package-switch */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[color:var(--text-muted)]">
          Seat-package per klant:
        </span>
        <div
          className="inline-flex gap-1 rounded-lg border bg-white p-1"
          style={{ borderColor: "var(--border)" }}
        >
          {PACKAGES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPkg(p)}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                pkg === p
                  ? "text-white"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
              }`}
              style={pkg === p ? { background: "#042660" } : undefined}
            >
              {p} seats
            </button>
          ))}
        </div>
        <span className="text-xs text-[color:var(--text-muted)]">
          → {fmtEuro(perCustomer)} per klant per maand
        </span>
      </div>

      {/* Tijdlijn */}
      <div className="mt-6 overflow-x-auto">
        <div className="relative min-w-[680px] py-12">
          {/* Horizontale lijn */}
          <div
            className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--aqua-200) 0%, var(--orange-50) 50%, #FDBA74 100%)",
            }}
          />

          {/* Mijlpalen */}
          <div className="relative flex justify-between">
            {points.map((p) => (
              <div
                key={p.date}
                className="flex w-20 flex-col items-center text-center"
              >
                {/* Klanten boven lijn */}
                <div
                  className={`mb-3 rounded-lg border px-2 py-1.5 text-center ${
                    p.isStart ? "opacity-50" : ""
                  }`}
                  style={{
                    background: p.isEnd ? "#FFF7ED" : "white",
                    borderColor: p.isEnd ? "#FDBA74" : "var(--border)",
                  }}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                    Klanten
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{
                      color: p.isEnd ? "#9A3412" : "var(--navy)",
                    }}
                  >
                    {p.customers.toLocaleString("nl-NL")}
                  </div>
                </div>

                {/* Maand-label net boven de lijn */}
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--navy)]">
                  {p.label}
                </div>

                {/* Bolletje op de lijn */}
                <div
                  className="size-3 rounded-full border-2 border-white shadow-md"
                  style={{
                    background: p.isEnd
                      ? "#FF8441"
                      : p.isStart
                        ? "#94a3b8"
                        : "#042660",
                  }}
                />

                {/* MRR onder lijn */}
                <div
                  className={`mt-3 rounded-lg border px-2 py-1.5 text-center ${
                    p.isStart ? "opacity-50" : ""
                  }`}
                  style={{
                    background: p.isEnd ? "#FFF7ED" : "white",
                    borderColor: p.isEnd ? "#FDBA74" : "var(--border)",
                  }}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                    MRR
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{
                      color: p.isEnd ? "#9A3412" : "var(--navy)",
                    }}
                  >
                    {fmtEuro(p.mrrCents, true)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voet-uitleg */}
      <div
        className="mt-4 grid gap-2 rounded-lg border bg-[color:var(--bg)] p-3 text-[11px] sm:grid-cols-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <div className="font-semibold text-[color:var(--text-muted)]">
            Eindtarget
          </div>
          <div className="font-bold text-[color:var(--navy)]">
            €80.000 MRR per 01-01-2027
          </div>
        </div>
        <div>
          <div className="font-semibold text-[color:var(--text-muted)]">
            Aanpak
          </div>
          <div className="text-[color:var(--text)]">
            Lineair groeien over 7 maanden, ~{fmtEuro(TARGET_MRR_CENTS / 7)} per maand erbij
          </div>
        </div>
        <div>
          <div className="font-semibold text-[color:var(--text-muted)]">
            Klanten nodig
          </div>
          <div className="font-bold text-[#9A3412]">
            {finalCustomers.toLocaleString("nl-NL")} × {pkg}-seat klanten
          </div>
        </div>
      </div>
    </section>
  );
}
