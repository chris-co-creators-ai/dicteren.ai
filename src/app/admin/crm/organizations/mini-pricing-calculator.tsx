"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Send } from "lucide-react";
import {
  DEFAULT_PRICING,
  tierForSeats,
  perSeatCentsForPeriod,
  businessAmountCents,
  tierLabel,
  type BillingPeriod,
  type PricingSnapshot,
} from "@/lib/services/pricingTiers";

type Period = "monthly" | "quarterly" | "yearly";

const PERIOD_LABELS: Record<Period, string> = {
  monthly: "Maand",
  quarterly: "Kwartaal",
  yearly: "Jaar",
};

const PLAN_SLUG: Record<Period, string> = {
  monthly: "org-monthly",
  quarterly: "org-quarterly",
  yearly: "org-yearly",
};

function fmtCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

type Result = {
  seats: number;
  amountCents: number;
  planSlug: string;
  discountCode: string | null;
};

export function MiniPricingCalculator({
  onInject,
}: {
  onInject: (r: Result) => void;
}) {
  const [pricing, setPricing] = useState<PricingSnapshot>(DEFAULT_PRICING);
  const [seats, setSeats] = useState(5);
  const [period, setPeriod] = useState<Period>("yearly");
  const [discountPct, setDiscountPct] = useState(0);
  const [discountCode, setDiscountCode] = useState("");

  // Live prijs-config ophalen zodat de calculator exact rekent zoals checkout.
  useEffect(() => {
    let active = true;
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.success && d.data) setPricing(d.data as PricingSnapshot);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const maxSeats = pricing.customQuoteFrom - 1;
  const tier = useMemo(() => tierForSeats(pricing, seats), [pricing, seats]);
  const isCustom = seats >= pricing.customQuoteFrom;

  const perSeatThisPeriod = perSeatCentsForPeriod(
    pricing,
    seats,
    period as BillingPeriod,
  );
  const subtotal = businessAmountCents(pricing, seats, period as BillingPeriod);
  const discountAmount = Math.round(subtotal * (discountPct / 100));
  const total = subtotal - discountAmount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="size-4" style={{ color: "#042660" }} strokeWidth={2.2} />
        <h3 className="text-sm font-bold text-[color:var(--navy)]">Prijzen-calculator</h3>
      </div>

      {/* Seats */}
      <div>
        <label className="text-xs font-semibold text-[color:var(--text)]">Seats</label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeats(Math.max(1, seats - 1))}
            className="size-7 rounded-lg border bg-white text-sm font-bold"
            style={{ borderColor: "var(--border)" }}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxSeats}
            value={seats}
            onChange={(e) =>
              setSeats(Math.max(1, Math.min(maxSeats, Number(e.target.value) || 1)))
            }
            className="w-16 rounded-lg border bg-white px-2 py-1.5 text-center text-sm font-bold"
            style={{ borderColor: "var(--border)" }}
          />
          <button
            type="button"
            onClick={() => setSeats(Math.min(maxSeats, seats + 1))}
            className="size-7 rounded-lg border bg-white text-sm font-bold"
            style={{ borderColor: "var(--border)" }}
          >
            +
          </button>
        </div>
      </div>

      {/* Periode */}
      <div>
        <label className="text-xs font-semibold text-[color:var(--text)]">Periode</label>
        <div
          className="mt-1 inline-flex gap-1 rounded-lg border bg-white p-0.5 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          {(["monthly", "quarterly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                period === p
                  ? "text-white"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
              }`}
              style={period === p ? { background: "#042660" } : undefined}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Kortingscode */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-[color:var(--text)]">Korting %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={discountPct}
            onChange={(e) =>
              setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
            }
            className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[color:var(--text)]">Code</label>
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            placeholder="bv. RESELLER-A1B2C3"
            className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-sm uppercase"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>

      {/* Resultaat */}
      <div
        className="space-y-1.5 rounded-lg border p-3 text-xs"
        style={{ background: "var(--aqua-50)", borderColor: "var(--aqua-200)" }}
      >
        <div className="flex justify-between">
          <span className="text-[color:var(--text-muted)]">Staffel</span>
          <span className="font-semibold text-[color:var(--navy)]">
            {tierLabel(tier)} ({tier.discountPct > 0 ? `−${tier.discountPct}%` : "geen"})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[color:var(--text-muted)]">Prijs per seat</span>
          <span className="font-semibold">
            {fmtCents(perSeatThisPeriod)} / {PERIOD_LABELS[period].toLowerCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[color:var(--text-muted)]">Subtotaal</span>
          <span className="font-semibold">{fmtCents(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between" style={{ color: "#9A3412" }}>
            <span>Korting −{discountPct}%</span>
            <span className="font-semibold">−{fmtCents(discountAmount)}</span>
          </div>
        )}
        <div
          className="mt-2 flex justify-between border-t pt-2"
          style={{ borderColor: "var(--aqua-200)" }}
        >
          <span className="font-bold text-[color:var(--navy)]">Totaal</span>
          <span className="text-base font-bold text-[color:var(--navy)]">
            {fmtCents(total)}
          </span>
        </div>
      </div>

      {/* Staffel-tabel */}
      <div className="rounded-lg border bg-white" style={{ borderColor: "var(--border)" }}>
        <div
          className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]"
          style={{ borderColor: "var(--border)" }}
        >
          Staffels
        </div>
        <ul className="text-xs">
          {pricing.tiers.map((t) => (
            <li
              key={t.id}
              className={`flex justify-between px-3 py-1 ${
                t.id === tier.id ? "bg-[color:var(--aqua-50)] font-bold" : ""
              }`}
              style={t.id === tier.id ? { color: "#042660" } : { color: "#5a6478" }}
            >
              <span>
                {t.min}–{t.max ?? "∞"} seats
              </span>
              <span>
                {fmtCents(t.pricePerSeatCents)}/j {t.discountPct > 0 && `(−${t.discountPct}%)`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Injecteer-knop */}
      <button
        type="button"
        disabled={isCustom}
        onClick={() =>
          onInject({
            seats,
            amountCents: total,
            planSlug: PLAN_SLUG[period],
            discountCode: discountCode.trim() || null,
          })
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
        style={{ background: "#FF8441" }}
      >
        <Send className="size-3.5" strokeWidth={2.4} />
        Injecteer in formulier
      </button>

      {isCustom && (
        <p className="text-[11px] text-[color:var(--text-muted)]">
          {pricing.customQuoteFrom}+ seats vereist een maatwerk-offerte. Neem direct contact op.
        </p>
      )}
    </div>
  );
}
