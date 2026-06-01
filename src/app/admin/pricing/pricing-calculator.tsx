"use client";

import { useState } from "react";
import {
  CUSTOM_QUOTE_FROM,
  getTierForSeats,
  nextTier,
  calculateTotalCents,
} from "@/lib/services/pricingTiers";

// Reseller-commissie-tool voor account managers — gebouwd om aan de telefoon te
// gebruiken. Links snelkeuzes, midden je commissie-totaal (over alle klanten die
// de reseller binnenhaalt) + de drie betaaltermijnen voor de eindklant.
//
// Model B (term-neutraal): commissie staat ALTIJD op de jaar-basisprijs.
//   - Volume-staffel (per seat) bepaalt de basisprijs per klant.
//   - 50% daarvan is commissie-pool; AM + reseller verdelen 'm. Dicteren houdt 50%.
//   - Twee schaal-assen: seats per klant × aantal klanten/jaar = portfolio-omzet.
//   - Termijn (maand/kwartaal/jaar) verandert alleen wat de KLANT betaalt; de
//     maand/kwartaal-opslag gaat naar Dicteren. Commissie is term-neutraal.
//   - Eindklant-discount komt altijd uit de reseller-commissie.

const POOL = 50;

const TERMS = [
  { key: "monthly", label: "Maandelijks", per: "p/maand", n: 12 },
  { key: "quarterly", label: "Kwartaal", per: "p/kwartaal", n: 4 },
  { key: "yearly", label: "Jaarlijks", per: "p/jaar", n: 1 },
] as const;
type TermKey = (typeof TERMS)[number]["key"];

const SEAT_PRESETS = [
  { label: "Klein", seats: 5 },
  { label: "Team", seats: 10 },
  { label: "MKB", seats: 25 },
  { label: "Groot", seats: 49 },
];
const CUSTOMER_PRESETS = [6, 12, 24, 52];
const SPLIT_PRESETS = [
  { label: "50 / 50", reseller: 25 },
  { label: "Jij 35 / 15", reseller: 15 },
  { label: "Jij 40 / 10", reseller: 10 },
];

function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function listAnnualCents(seats: number, term: TermKey): number {
  const t = TERMS.find((x) => x.key === term)!;
  return calculateTotalCents({ seats, period: term }).totalCents * t.n;
}

export function PricingCalculator() {
  const [seats, setSeats] = useState(10);
  const [customers, setCustomers] = useState(12);
  const [resellerPct, setResellerPct] = useState(25);
  const [discountOn, setDiscountOn] = useState(false);
  const [discountPct, setDiscountPct] = useState(10);

  const amPct = POOL - resellerPct;
  const safeSeats = Math.max(1, seats);
  const n = Math.max(0, customers);
  const custom = safeSeats >= CUSTOM_QUOTE_FROM;
  const effDiscount = discountOn ? Math.min(discountPct, resellerPct) : 0;
  const tier = getTierForSeats(safeSeats);
  const up = nextTier(safeSeats);

  // Commissie per klant op de jaar-basisprijs (term-neutraal).
  const baseCents = listAnnualCents(safeSeats, "yearly");
  const amPerKlant = Math.round((baseCents * amPct) / 100);
  const resellerPerKlant = Math.round((baseCents * (resellerPct - effDiscount)) / 100);
  const discountCents = Math.round((baseCents * effDiscount) / 100);
  const monthlyList = listAnnualCents(safeSeats, "monthly") || 1;

  // Portfolio = × aantal klanten dat de reseller binnenhaalt.
  const amTotal = amPerKlant * n;
  const resellerTotal = resellerPerKlant * n;

  const inputCls =
    "w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--orange)]";

  return (
    <div className="grid gap-5 lg:grid-cols-[11rem_1fr]">
      {/* Snelkeuze-sidepanel */}
      <aside className="brand-card h-fit p-3">
        <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Seats per klant
        </div>
        <div className="space-y-1.5">
          {SEAT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setSeats(p.seats)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                seats === p.seats
                  ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                  : "border-[color:var(--border-soft)] hover:border-[color:var(--navy)]"
              }`}
            >
              <span className="font-semibold">{p.label}</span>
              <span className={seats === p.seats ? "text-white/80" : "text-[color:var(--text-muted)]"}>
                {p.seats}
              </span>
            </button>
          ))}
        </div>
        <div className="my-3 border-t border-[color:var(--border-soft)]" />
        <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Klanten / jaar
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CUSTOMER_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCustomers(c)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                customers === c
                  ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                  : "border-[color:var(--border-soft)] hover:border-[color:var(--navy)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="my-3 border-t border-[color:var(--border-soft)]" />
        <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Verdeling
        </div>
        <div className="space-y-1.5">
          {SPLIT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setResellerPct(p.reseller)}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                resellerPct === p.reseller
                  ? "border-[color:var(--orange)] bg-[color:var(--orange)] text-white"
                  : "border-[color:var(--border-soft)] hover:border-[color:var(--orange)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="space-y-4">
        {/* Inputs: seats + klanten + verdeling */}
        <div className="brand-card grid gap-4 p-4 sm:grid-cols-3">
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
            <span className="mt-1 block text-[0.6875rem] text-[color:var(--text-soft)]">
              {custom
                ? "50+ = maatwerk"
                : `${euro(tier.pricePerSeatCents)}/seat${tier.discountPct > 0 ? ` · ${tier.discountPct}% volume` : " · geen volumekorting"}`}
              {up && !custom ? ` · +${up.min - safeSeats} → ${up.discountPct}%` : ""}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
              Klanten / jaar (reseller)
            </span>
            <input
              type="number"
              min={0}
              value={customers}
              onChange={(e) => setCustomers(Math.max(0, Number(e.target.value)))}
              className={inputCls}
            />
            <span className="mt-1 block text-[0.6875rem] text-[color:var(--text-soft)]">
              hoeveel klanten haalt de reseller binnen
            </span>
          </label>

          <div className="block">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span className="text-[color:var(--text-muted)]">Verdeling (pool {POOL}%)</span>
              <span>
                <span style={{ color: "var(--text-muted)" }}>Reseller {resellerPct}%</span>
                {"  ·  "}
                <span style={{ color: "var(--orange)" }}>Jij {amPct}%</span>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={POOL}
              step={1}
              value={resellerPct}
              onChange={(e) => {
                const v = Number(e.target.value);
                setResellerPct(v);
                if (discountPct > v) setDiscountPct(v);
              }}
              className="w-full accent-[color:var(--orange)]"
            />
            <button
              type="button"
              onClick={() => setDiscountOn((v) => !v)}
              className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                discountOn
                  ? "border-[color:var(--orange)] text-[color:var(--orange)]"
                  : "border-[color:var(--border-soft)] text-[color:var(--text-muted)]"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-6 rounded-full ${discountOn ? "bg-[color:var(--orange)]" : "bg-[color:var(--border-soft)]"}`}
              >
                <span
                  className={`block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${discountOn ? "translate-x-2.5" : ""}`}
                />
              </span>
              Eindklant-discount
              {discountOn ? ` ${effDiscount}%` : ""}
            </button>
            {discountOn && (
              <input
                type="range"
                min={0}
                max={resellerPct}
                step={1}
                value={Math.min(discountPct, resellerPct)}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="mt-2 w-full accent-[color:var(--orange)]"
              />
            )}
          </div>
        </div>

        {custom ? (
          <div className="brand-card border-l-4 border-[color:var(--orange)] p-4 text-sm">
            <strong>{CUSTOM_QUOTE_FROM}+ seats = maatwerk-offerte.</strong> Stem prijs en
            commissie af, dan reken ik 'm hier voor.
          </div>
        ) : (
          <>
            {/* Commissie-totaal over de hele reseller-portfolio — jij vs reseller */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="brand-card p-4" style={{ boxShadow: "0 0 0 2px var(--orange)" }}>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  Jouw commissie / jaar — {n} klant{n === 1 ? "" : "en"}
                </div>
                <div className="text-3xl font-bold tracking-tight text-[color:var(--orange)]">
                  {euro(amTotal)}
                </div>
                <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                  {euro(amPerKlant)}/klant × {n} · recurring · gelijk voor elke termijn
                </div>
              </div>
              <div className="brand-card p-4">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  Reseller verdient / jaar — {n} klant{n === 1 ? "" : "en"}
                </div>
                <div className="text-3xl font-bold tracking-tight text-[color:var(--navy)]">
                  {euro(resellerTotal)}
                </div>
                <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                  {euro(resellerPerKlant)}/klant × {n} · recurring
                  {effDiscount > 0 ? ` · na ${effDiscount}% discount` : ""}
                </div>
              </div>
            </div>

            {/* Drie betaaltermijnen voor de eindklant (per klant) */}
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[color:var(--text-muted)]">
                Wat één eindklant betaalt
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {TERMS.map((t) => {
                  const list = listAnnualCents(safeSeats, t.key);
                  const paidAnnual = list - discountCents;
                  const perPayment = Math.round(paidAnnual / t.n);
                  const korting = Math.round((1 - list / monthlyList) * 100);
                  return (
                    <div key={t.key} className="brand-card p-0">
                      <div className="flex items-center justify-between border-b border-[color:var(--border-soft)] px-4 py-2.5">
                        <span className="text-sm font-bold">{t.label}</span>
                        {korting > 0 ? (
                          <span className="rounded-full bg-[color:var(--green)] px-2 py-0.5 text-[0.625rem] font-bold text-white">
                            −{korting}%
                          </span>
                        ) : (
                          <span className="text-[0.625rem] font-semibold text-[color:var(--text-soft)]">
                            basis
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="text-2xl font-bold tracking-tight">{euro(perPayment)}</div>
                        <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                          {t.per} · {euro(paidAnnual)}/jaar
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {effDiscount > 0 && (
              <div className="brand-card border-l-4 border-[color:var(--navy)] p-4 text-sm">
                <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  Pitch voor de reseller
                </div>
                Bij een discount van {effDiscount}% voor jouw klantenbestand verdien JIJ{" "}
                <strong>{euro(resellerTotal)}</strong> op jaarbasis aan recurring commissie
                ({n} klant{n === 1 ? "" : "en"}).
              </div>
            )}

            <p className="text-[0.6875rem] text-[color:var(--text-soft)]">
              Bedragen excl. btw, zelfde staffel als /prijzen. Jouw commissie staat op de
              jaarprijs en is gelijk voor elke termijn; de maand/kwartaal-opslag gaat naar
              Dicteren. Meer seats per klant én meer klanten = meer recurring.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
