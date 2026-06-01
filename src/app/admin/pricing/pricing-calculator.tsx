"use client";

import { useMemo, useState } from "react";
import {
  SEAT_TIERS,
  CUSTOM_QUOTE_FROM,
  getTierForSeats,
  tierLabel,
} from "@/lib/services/pricingTiers";

// Snelle deal-calculator voor account managers. Twee keuzes (product + periode),
// marge invoeren, seats invoeren → eindklantprijs, partner-commissie, Dicteren-
// netto en jaarlijks terugkerende omzet voor de reseller. Geen ruis.

type ConsumerPlan = { period: string; priceCents: number };
type Product = "business" | "consumer";
type Period = "monthly" | "quarterly" | "yearly";

const PERIODS_PER_YEAR: Record<Period, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};
const PERIOD_LABEL: Record<Period, string> = {
  monthly: "per maand",
  quarterly: "per kwartaal",
  yearly: "per jaar",
};

// Fallback consumer-prijzen als de plans-tabel een periode mist (= live tarieven).
const CONSUMER_FALLBACK: Record<Period, number> = {
  monthly: 1200,
  quarterly: 3000,
  yearly: 9600,
};

function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function PricingCalculator({
  consumerPlans,
}: {
  consumerPlans: ConsumerPlan[];
}) {
  const [product, setProduct] = useState<Product>("business");
  const [period, setPeriod] = useState<Period>("yearly");
  const [marginPct, setMarginPct] = useState<number>(20);
  const [seats, setSeats] = useState<number>(10);

  // Zakelijk is altijd per jaar; consument heeft een vrije periode.
  const effectivePeriod: Period = product === "business" ? "yearly" : period;
  const effectiveSeats = product === "business" ? Math.max(1, seats) : 1;

  const calc = useMemo(() => {
    const consumerCents = (p: Period): number =>
      consumerPlans.find((c) => c.period === p)?.priceCents ??
      CONSUMER_FALLBACK[p];

    const customQuote =
      product === "business" && effectiveSeats >= CUSTOM_QUOTE_FROM;
    const tier = getTierForSeats(effectiveSeats);

    const perSeatCents =
      product === "business"
        ? tier.pricePerSeatCents
        : consumerCents(effectivePeriod);
    const totalCents =
      product === "business"
        ? perSeatCents * effectiveSeats
        : consumerCents(effectivePeriod);

    const commissionCents = Math.round((totalCents * marginPct) / 100);
    const dicterenNetCents = totalCents - commissionCents;
    const recurringYearCents =
      commissionCents * PERIODS_PER_YEAR[effectivePeriod];

    return {
      customQuote,
      tier,
      perSeatCents,
      totalCents,
      commissionCents,
      dicterenNetCents,
      recurringYearCents,
    };
  }, [product, effectivePeriod, effectiveSeats, marginPct, consumerPlans]);

  const inputCls =
    "w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--orange)]";

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="brand-card grid gap-4 p-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
            Product
          </span>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value as Product)}
            className={inputCls}
          >
            <option value="business">Zakelijk (per seat)</option>
            <option value="consumer">Consument</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
            Periode
          </span>
          <select
            value={effectivePeriod}
            onChange={(e) => setPeriod(e.target.value as Period)}
            disabled={product === "business"}
            className={`${inputCls} disabled:opacity-60`}
          >
            {product === "business" ? (
              <option value="yearly">Per jaar</option>
            ) : (
              <>
                <option value="monthly">Per maand</option>
                <option value="quarterly">Per kwartaal</option>
                <option value="yearly">Per jaar</option>
              </>
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
            Marge partner (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={marginPct}
            onChange={(e) =>
              setMarginPct(Math.min(100, Math.max(0, Number(e.target.value))))
            }
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
            Seats
          </span>
          <input
            type="number"
            min={1}
            value={product === "business" ? seats : 1}
            disabled={product !== "business"}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
            className={`${inputCls} disabled:opacity-60`}
          />
        </label>
      </div>

      {calc.customQuote ? (
        <div className="brand-card border-l-4 border-[color:var(--orange)] p-4 text-sm">
          <strong>{CUSTOM_QUOTE_FROM}+ seats = maatwerk-offerte.</strong> Boven de
          staffel rekenen we niet automatisch. Neem contact op voor een custom prijs.
        </div>
      ) : (
        <>
          {/* Rekensom */}
          <div className="brand-card p-4 text-sm">
            <span className="font-semibold">Rekensom: </span>
            {product === "business" ? (
              <>
                {effectiveSeats} seats × {euro(calc.perSeatCents)}/seat
                {calc.tier.discountPct > 0
                  ? ` (${calc.tier.discountPct}% staffel, ${tierLabel(calc.tier)})`
                  : " (geen staffelkorting)"}{" "}
                = <strong>{euro(calc.totalCents)}</strong> per jaar
              </>
            ) : (
              <>
                Consument {PERIOD_LABEL[effectivePeriod]} ={" "}
                <strong>{euro(calc.totalCents)}</strong>
              </>
            )}
          </div>

          {/* Resultaat-kolommen */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={`Eindklant betaalt (${PERIOD_LABEL[effectivePeriod]})`}
              value={euro(calc.totalCents)}
            />
            <Stat
              label={`Commissie partner (${marginPct}%)`}
              value={euro(calc.commissionCents)}
              accent="orange"
            />
            <Stat
              label="Dicteren netto"
              value={euro(calc.dicterenNetCents)}
              accent="navy"
            />
            <Stat
              label="Recurring p/jaar partner"
              value={euro(calc.recurringYearCents)}
              accent="green"
              hint={
                effectivePeriod === "yearly"
                  ? "1× per jaar"
                  : `${PERIODS_PER_YEAR[effectivePeriod]}× ${euro(calc.commissionCents)}`
              }
            />
          </div>
        </>
      )}

      {/* Staffel-referentie */}
      {product === "business" && (
        <div className="brand-card p-4">
          <div className="mb-2 text-xs font-semibold text-[color:var(--text-muted)]">
            Zakelijke staffel (per seat / jaar)
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {SEAT_TIERS.map((t) => (
              <span
                key={t.id}
                className={`rounded-full px-2.5 py-1 ${
                  t.id === calc.tier.id
                    ? "bg-[color:var(--navy)] font-semibold text-white"
                    : "bg-[color:var(--bg-deep)] text-[color:var(--text-muted)]"
                }`}
              >
                {tierLabel(t)}: {euro(t.pricePerSeatCents)}
                {t.discountPct > 0 ? ` (-${t.discountPct}%)` : ""}
              </span>
            ))}
            <span className="rounded-full bg-[color:var(--bg-deep)] px-2.5 py-1 text-[color:var(--text-muted)]">
              {CUSTOM_QUOTE_FROM}+: maatwerk
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: "orange" | "navy" | "green";
  hint?: string;
}) {
  const color =
    accent === "orange"
      ? "var(--orange)"
      : accent === "green"
        ? "var(--green)"
        : accent === "navy"
          ? "var(--navy)"
          : "var(--text)";
  return (
    <div className="brand-card p-4">
      <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={{ color }}>
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-soft)]">
          {hint}
        </div>
      )}
    </div>
  );
}
