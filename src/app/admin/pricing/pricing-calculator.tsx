"use client";

import { useState } from "react";
import {
  CUSTOM_QUOTE_FROM,
  getTierForSeats,
  nextTier,
  tierLabel,
  calculateTotalCents,
} from "@/lib/services/pricingTiers";

// Reseller-commissie-tool voor account managers — gebouwd om aan de telefoon te
// gebruiken. Links snelkeuzes, midden de drie termijnen naast elkaar met prijs +
// korting + jouw commissie. Twee onafhankelijke kortingen:
//   - VOLUME (staffel, per seat) — verandert NIET door de termijn.
//   - TERMIJN — langer vastleggen = goedkoper (maand → kwartaal → jaar).
// Van de eindklantprijs is 50% commissie-pool; Dicteren houdt 50%. De AM verdeelt
// de pool met de reseller. Eindklant-discount komt altijd uit de reseller-commissie.

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

function annualListCents(seats: number, term: TermKey): number {
  const t = TERMS.find((x) => x.key === term)!;
  const perPayment = calculateTotalCents({ seats, period: term }).totalCents;
  return perPayment * t.n;
}

function termSplit(seats: number, resellerPct: number, discountPct: number, term: TermKey) {
  const t = TERMS.find((x) => x.key === term)!;
  const annualList = annualListCents(seats, term);
  const amPct = POOL - resellerPct;
  const amCents = Math.round((annualList * amPct) / 100);
  const dicterenCents = Math.round((annualList * POOL) / 100);
  const resellerCents = Math.round((annualList * (resellerPct - discountPct)) / 100);
  const eindklantAnnual = annualList - Math.round((annualList * discountPct) / 100);
  return {
    annualList,
    amCents,
    dicterenCents,
    resellerCents,
    eindklantAnnual,
    eindklantPerPayment: Math.round(eindklantAnnual / t.n),
  };
}

export function PricingCalculator() {
  const [seats, setSeats] = useState(10);
  const [resellerPct, setResellerPct] = useState(25);
  const [discountOn, setDiscountOn] = useState(false);
  const [discountPct, setDiscountPct] = useState(10);
  const [customersPerYear, setCustomersPerYear] = useState(12);
  const [selected, setSelected] = useState<TermKey>("yearly");

  const amPct = POOL - resellerPct;
  const safeSeats = Math.max(1, seats);
  const custom = safeSeats >= CUSTOM_QUOTE_FROM;
  const effDiscount = discountOn ? Math.min(discountPct, resellerPct) : 0;
  const tier = getTierForSeats(safeSeats);
  const up = nextTier(safeSeats);

  // Korting per termijn t.o.v. maandelijks (duurste).
  const monthlyAnnual = annualListCents(safeSeats, "monthly") || 1;
  const sel = termSplit(safeSeats, resellerPct, effDiscount, selected);

  const inputCls =
    "w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--orange)]";

  return (
    <div className="grid gap-5 lg:grid-cols-[11rem_1fr]">
      {/* Snelkeuze-sidepanel */}
      <aside className="brand-card h-fit p-3">
        <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Snelkeuze
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
                {p.seats} seats
              </span>
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
        {/* Inputs */}
        <div className="brand-card grid gap-4 p-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
              Seats
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
                : `${euro(tier.pricePerSeatCents)}/seat${tier.discountPct > 0 ? ` · ${tier.discountPct}% volumekorting` : " · geen volumekorting"}`}
              {up && !custom ? ` · +${up.min - safeSeats} → ${up.discountPct}%` : ""}
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
            {/* Drie termijn-kolommen */}
            <div className="grid gap-3 sm:grid-cols-3">
              {TERMS.map((t) => {
                const sp = termSplit(safeSeats, resellerPct, effDiscount, t.key);
                const korting = Math.round((1 - sp.annualList / monthlyAnnual) * 100);
                const isSel = selected === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelected(t.key)}
                    className="brand-card p-0 text-left"
                    style={isSel ? { boxShadow: "0 0 0 2px var(--orange)" } : undefined}
                  >
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
                    <div className="space-y-2.5 p-4">
                      <div>
                        <div className="text-xl font-bold tracking-tight">
                          {euro(sp.eindklantPerPayment)}
                        </div>
                        <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                          eindklant {t.per} · {euro(sp.eindklantAnnual)}/jaar
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tracking-tight text-[color:var(--orange)]">
                          {euro(sp.amCents)}
                        </div>
                        <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                          jouw commissie / jaar
                        </div>
                      </div>
                      <div className="text-[0.75rem] text-[color:var(--navy)]">
                        reseller {euro(sp.resellerCents)}/jaar
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Jaarprojectie reseller + pitch — op basis van de gekozen termijn */}
            <div className="brand-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
              <span className="font-semibold">
                Reseller verkoopt
                <input
                  type="number"
                  min={0}
                  value={customersPerYear}
                  onChange={(e) => setCustomersPerYear(Math.max(0, Number(e.target.value)))}
                  className="mx-2 w-16 rounded-md border border-[color:var(--border-soft)] px-2 py-1 text-center"
                />
                klanten/jaar ({TERMS.find((t) => t.key === selected)!.label.toLowerCase()}):
              </span>
              <span>
                Jij{" "}
                <strong className="text-[color:var(--orange)]">
                  {euro(sel.amCents * customersPerYear)}
                </strong>{" "}
                · reseller{" "}
                <strong className="text-[color:var(--navy)]">
                  {euro(sel.resellerCents * customersPerYear)}
                </strong>{" "}
                recurring / jaar
              </span>
            </div>

            {effDiscount > 0 && (
              <div className="brand-card border-l-4 border-[color:var(--navy)] p-4 text-sm">
                <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  Pitch voor de reseller
                </div>
                Bij een discount van {effDiscount}% voor jouw klantenbestand verdien JIJ{" "}
                <strong>{euro(sel.resellerCents * customersPerYear)}</strong> op jaarbasis aan
                recurring commissie.
              </div>
            )}

            <p className="text-[0.6875rem] text-[color:var(--text-soft)]">
              Bedragen excl. btw, zelfde staffel als /prijzen. Termijn-korting is t.o.v.
              maandelijks; de volumekorting (per seat) staat los van de termijn.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
