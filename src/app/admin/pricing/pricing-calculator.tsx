"use client";

import { useState } from "react";
import {
  SEAT_TIERS,
  CUSTOM_QUOTE_FROM,
  getTierForSeats,
  nextTier,
  tierLabel,
} from "@/lib/services/pricingTiers";

// Reseller-commissie-tool voor account managers.
//
// Van de eindklantprijs is COMMISSION_POOL_PCT (50%) commissie. Dicteren houdt
// de andere helft. De AM verdeelt de pool tussen reseller en zichzelf: geeft 'ie
// de reseller meer, dan gaat dat van zijn eigen commissie af. Alles recurring per
// jaar (zakelijk abo).
//
// Eindklant-discount: korting voor de eindklant die ALTIJD uit de reseller-
// commissie komt. Jouw deel en Dicteren-netto blijven gelijk; alleen de reseller
// levert in. Daarom is de discount gecapt op de reseller-%.

const COMMISSION_POOL_PCT = 50;

function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function splitFor(seats: number, resellerPct: number, discountPct: number) {
  const tier = getTierForSeats(seats);
  const perSeatCents = tier.pricePerSeatCents;
  const listCents = perSeatCents * seats;
  const amPct = COMMISSION_POOL_PCT - resellerPct;

  const discountCents = Math.round((listCents * discountPct) / 100);
  const endCustomerCents = listCents - discountCents; // klant betaalt na korting
  const amCents = Math.round((listCents * amPct) / 100); // ongewijzigd door discount
  // Reseller draagt de hele korting: (reseller% − discount%) van de lijstprijs.
  const resellerCents = Math.round((listCents * (resellerPct - discountPct)) / 100);
  const dicterenCents = endCustomerCents - resellerCents - amCents; // = 50% lijst
  return {
    tier,
    perSeatCents,
    listCents,
    discountCents,
    endCustomerCents,
    resellerCents,
    amCents,
    dicterenCents,
  };
}

const MILESTONES = [4, 9, 24, 49]; // top van elke staffel

export function PricingCalculator() {
  const [seats, setSeats] = useState<number>(10);
  const [resellerPct, setResellerPct] = useState<number>(25);
  const [customersPerYear, setCustomersPerYear] = useState<number>(12);
  const [period, setPeriod] = useState<"yearly" | "quarterly">("yearly");
  const [discountOn, setDiscountOn] = useState<boolean>(false);
  const [discountPct, setDiscountPct] = useState<number>(10);

  const amPct = COMMISSION_POOL_PCT - resellerPct;
  // Facturatie verandert alleen de betaalcadans, niet de jaaromzet: kwartaal =
  // jaartotaal in 4 termijnen. Recurring per jaar blijft gelijk.
  const paymentsPerYear = period === "quarterly" ? 4 : 1;
  const perLabel = period === "quarterly" ? "kwartaal" : "jaar";
  const safeSeats = Math.max(1, seats);
  const n = Math.max(0, customersPerYear);
  const custom = safeSeats >= CUSTOM_QUOTE_FROM;
  // Discount kan nooit meer zijn dan de reseller-commissie (komt daaruit).
  const effDiscount = discountOn ? Math.min(discountPct, resellerPct) : 0;
  const s = splitFor(safeSeats, resellerPct, effDiscount);
  const up = nextTier(safeSeats);

  const inputCls =
    "w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--orange)]";

  const rows: {
    label: string;
    perDeal: number;
    perYear: number;
    accent?: "orange" | "navy";
    hero?: boolean;
  }[] = [
    { label: "Eindklant betaalt", perDeal: Math.round(s.endCustomerCents / paymentsPerYear), perYear: s.endCustomerCents * n },
    {
      label: `Reseller (${resellerPct}%${effDiscount > 0 ? ` − ${effDiscount}% korting` : ""})`,
      perDeal: Math.round(s.resellerCents / paymentsPerYear),
      perYear: s.resellerCents * n,
      accent: "navy",
    },
    { label: `Jouw commissie (${amPct}%)`, perDeal: Math.round(s.amCents / paymentsPerYear), perYear: s.amCents * n, accent: "orange", hero: true },
    { label: "Dicteren netto", perDeal: Math.round(s.dicterenCents / paymentsPerYear), perYear: s.dicterenCents * n },
  ];

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="brand-card grid gap-5 p-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
            Seats per klant
          </span>
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
            className={inputCls}
          />
          {up && !custom && (
            <span className="mt-1 block text-[0.6875rem] text-[color:var(--text-soft)]">
              +{up.min - safeSeats} → staffel {tierLabel(up)} ({up.discountPct}% korting,{" "}
              {euro(up.pricePerSeatCents)}/seat)
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
            Zakelijke klanten / jaar
          </span>
          <input
            type="number"
            min={0}
            value={customersPerYear}
            onChange={(e) => setCustomersPerYear(Math.max(0, Number(e.target.value)))}
            className={inputCls}
          />
          <span className="mt-1 block text-[0.6875rem] text-[color:var(--text-soft)]">
            verwachte verkoop door de reseller
          </span>
        </label>

        {/* Verdeling pool */}
        <div className="block">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className="text-[color:var(--text-muted)]">
              Verdeling (pool {COMMISSION_POOL_PCT}%)
            </span>
            <span>
              <span style={{ color: "var(--text-muted)" }}>Reseller {resellerPct}%</span>
              {"  ·  "}
              <span style={{ color: "var(--orange)" }}>Jij {amPct}%</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={COMMISSION_POOL_PCT}
            step={1}
            value={resellerPct}
            onChange={(e) => {
              const v = Number(e.target.value);
              setResellerPct(v);
              if (discountPct > v) setDiscountPct(v);
            }}
            className="w-full accent-[color:var(--orange)]"
          />
          <div className="mt-1 flex justify-between text-[0.6875rem] text-[color:var(--text-soft)]">
            <span>alles voor jou</span>
            <span>50/50</span>
            <span>alles reseller</span>
          </div>

          {/* Toggle: eindklant-discount */}
          <button
            type="button"
            onClick={() => setDiscountOn((v) => !v)}
            className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              discountOn
                ? "border-[color:var(--orange)] text-[color:var(--orange)]"
                : "border-[color:var(--border-soft)] text-[color:var(--text-muted)]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-6 rounded-full transition-colors ${
                discountOn ? "bg-[color:var(--orange)]" : "bg-[color:var(--border-soft)]"
              }`}
            >
              <span
                className={`block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  discountOn ? "translate-x-2.5" : "translate-x-0"
                }`}
              />
            </span>
            Eindklant-discount
          </button>

          {discountOn && (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-[color:var(--text-muted)]">
                  Discount (uit reseller-commissie)
                </span>
                <span style={{ color: "var(--orange)" }}>{effDiscount}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={resellerPct}
                step={1}
                value={Math.min(discountPct, resellerPct)}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="w-full accent-[color:var(--orange)]"
              />
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                max = reseller-% ({resellerPct}%); de korting gaat volledig van de reseller af.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Facturatie-periode */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[color:var(--text-muted)]">
          Facturatie:
        </span>
        {(["yearly", "quarterly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              period === p
                ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                : "border-[color:var(--border-soft)] text-[color:var(--text-muted)]"
            }`}
          >
            {p === "yearly" ? "Per jaar" : "Per kwartaal"}
          </button>
        ))}
      </div>

      {custom ? (
        <div className="brand-card border-l-4 border-[color:var(--orange)] p-4 text-sm">
          <strong>{CUSTOM_QUOTE_FROM}+ seats = maatwerk-offerte.</strong> Boven de
          staffel rekenen we niet automatisch. Stem prijs en commissie af, dan reken ik 'm hier voor.
        </div>
      ) : (
        <>
          {/* Rekensom (per klant) */}
          <div className="brand-card p-4 text-sm">
            <span className="font-semibold">Rekensom per klant: </span>
            {safeSeats} seats × {euro(s.perSeatCents)}/seat
            {s.tier.discountPct > 0
              ? ` (${s.tier.discountPct}% staffel, ${tierLabel(s.tier)})`
              : " (geen staffelkorting)"}{" "}
            = <strong>{euro(s.listCents)}</strong> lijst/jaar excl. btw
            {effDiscount > 0 && (
              <>
                {" "}
                · na {effDiscount}% discount betaalt de klant{" "}
                <strong>{euro(s.endCustomerCents)}</strong>
              </>
            )}
            . Alles recurring zolang de klant blijft.
          </div>

          {/* Resultaat: per klant + per jaar (× aantal) */}
          <div className="brand-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[0.6875rem] uppercase tracking-wide text-[color:var(--text-muted)]">
                    <th className="px-4 py-2.5 font-semibold"> </th>
                    <th className="px-4 py-2.5 font-semibold">Per klant / {perLabel}</th>
                    <th className="px-4 py-2.5 font-semibold">
                      Per jaar ({n} klant{n === 1 ? "" : "en"})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const color =
                      r.accent === "orange"
                        ? "var(--orange)"
                        : r.accent === "navy"
                          ? "var(--navy)"
                          : "var(--text)";
                    return (
                      <tr
                        key={r.label}
                        className="border-t border-[color:var(--border-soft)]"
                        style={
                          r.hero
                            ? { background: "color-mix(in srgb, var(--orange) 8%, white)" }
                            : undefined
                        }
                      >
                        <td className="px-4 py-2.5 font-semibold" style={{ color }}>
                          {r.label}
                        </td>
                        <td className="px-4 py-2.5" style={{ color }}>
                          {euro(r.perDeal)}
                        </td>
                        <td
                          className={`px-4 py-2.5 ${r.hero ? "text-xl font-bold" : "font-semibold"}`}
                          style={{ color }}
                        >
                          {euro(r.perYear)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[color:var(--border-soft)] px-4 py-2 text-[0.6875rem] text-[color:var(--text-soft)]">
              Per jaar = de hele verwachte verkoop van de reseller. Recurring: jaar 2
              komt hier bovenop zolang de klanten blijven. Bedragen excl. btw, zelfde
              staffel als de /prijzen-pagina. Facturatie per kwartaal verandert de prijs niet.
            </div>
          </div>

          {/* Pitch-zin voor de reseller (bij discount) */}
          {effDiscount > 0 && (
            <div className="brand-card border-l-4 border-[color:var(--navy)] p-4 text-sm">
              <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Pitch voor de reseller
              </div>
              Bij een discount van {effDiscount}% voor jouw klantenbestand verdien JIJ{" "}
              <strong>{euro(s.resellerCents * n)}</strong> op jaarbasis aan recurring
              commissie.
            </div>
          )}

          {/* Staffel-tabel: jouw bottom-line per deal-grootte */}
          <div className="brand-card overflow-hidden p-0">
            <div className="border-b border-[color:var(--border-soft)] px-4 py-3 text-xs font-semibold text-[color:var(--text-muted)]">
              Jouw commissie per deal-grootte — reseller {resellerPct}% / jij {amPct}%
              {effDiscount > 0 ? ` / ${effDiscount}% discount` : ""}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[0.6875rem] uppercase tracking-wide text-[color:var(--text-muted)]">
                    <th className="px-4 py-2 font-semibold">Seats</th>
                    <th className="px-4 py-2 font-semibold">Per seat</th>
                    <th className="px-4 py-2 font-semibold">Eindklant / jr</th>
                    <th className="px-4 py-2 font-semibold">Reseller / jr</th>
                    <th className="px-4 py-2 font-semibold text-[color:var(--orange)]">Jij / jr</th>
                  </tr>
                </thead>
                <tbody>
                  {MILESTONES.map((m) => {
                    const row = splitFor(m, resellerPct, effDiscount);
                    const isCurrentTier = row.tier.id === s.tier.id;
                    return (
                      <tr
                        key={m}
                        className="border-t border-[color:var(--border-soft)]"
                        style={
                          isCurrentTier
                            ? { background: "color-mix(in srgb, var(--orange) 8%, white)" }
                            : undefined
                        }
                      >
                        <td className="px-4 py-2 font-semibold">{m}</td>
                        <td className="px-4 py-2 text-[color:var(--text-muted)]">
                          {euro(row.perSeatCents)}
                          {row.tier.discountPct > 0 ? ` (-${row.tier.discountPct}%)` : ""}
                        </td>
                        <td className="px-4 py-2">{euro(row.endCustomerCents)}</td>
                        <td className="px-4 py-2 text-[color:var(--navy)]">{euro(row.resellerCents)}</td>
                        <td className="px-4 py-2 font-bold text-[color:var(--orange)]">{euro(row.amCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[color:var(--border-soft)] px-4 py-2 text-[0.6875rem] text-[color:var(--text-soft)]">
              Meer seats = lagere per-seat via de staffel, maar grotere pool. Jouw deel
              verandert niet door de eindklant-discount — die komt enkel van de reseller.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
