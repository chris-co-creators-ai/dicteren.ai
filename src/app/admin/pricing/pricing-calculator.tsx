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
// de andere helft. De AM verdeelt de pool tussen de reseller en zichzelf:
// geeft 'ie de reseller meer, dan gaat dat van zijn eigen commissie af.
// Alles recurring per jaar (zakelijk abo). Meer seats = lagere per-seat via de
// staffel, maar grotere pool → hogere bottom-line.

const COMMISSION_POOL_PCT = 50;

function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function splitFor(seats: number, resellerPct: number) {
  const tier = getTierForSeats(seats);
  const perSeatCents = tier.pricePerSeatCents;
  const endCustomerCents = perSeatCents * seats;
  const amPct = COMMISSION_POOL_PCT - resellerPct;
  const resellerCents = Math.round((endCustomerCents * resellerPct) / 100);
  const amCents = Math.round((endCustomerCents * amPct) / 100);
  const dicterenCents = endCustomerCents - resellerCents - amCents;
  return {
    tier,
    perSeatCents,
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

  const amPct = COMMISSION_POOL_PCT - resellerPct;
  const safeSeats = Math.max(1, seats);
  const custom = safeSeats >= CUSTOM_QUOTE_FROM;
  const s = splitFor(safeSeats, resellerPct);
  const up = nextTier(safeSeats);

  const inputCls =
    "w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--orange)]";

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="brand-card grid gap-5 p-4 sm:grid-cols-2">
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
          {up && !custom && (
            <span className="mt-1 block text-[0.6875rem] text-[color:var(--text-soft)]">
              +{up.min - safeSeats} seats → staffel {tierLabel(up)} ({up.discountPct}% korting,{" "}
              {euro(up.pricePerSeatCents)}/seat)
            </span>
          )}
        </label>

        <div className="block">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className="text-[color:var(--text-muted)]">
              Commissie-verdeling (pool {COMMISSION_POOL_PCT}%)
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
            onChange={(e) => setResellerPct(Number(e.target.value))}
            className="w-full accent-[color:var(--orange)]"
          />
          <div className="mt-1 flex justify-between text-[0.6875rem] text-[color:var(--text-soft)]">
            <span>alles voor jou</span>
            <span>50/50</span>
            <span>alles reseller</span>
          </div>
        </div>
      </div>

      {custom ? (
        <div className="brand-card border-l-4 border-[color:var(--orange)] p-4 text-sm">
          <strong>{CUSTOM_QUOTE_FROM}+ seats = maatwerk-offerte.</strong> Boven de
          staffel rekenen we niet automatisch. Stem de prijs en commissie af, dan reken ik 'm hier voor.
        </div>
      ) : (
        <>
          {/* Rekensom */}
          <div className="brand-card p-4 text-sm">
            <span className="font-semibold">Rekensom: </span>
            {safeSeats} seats × {euro(s.perSeatCents)}/seat
            {s.tier.discountPct > 0
              ? ` (${s.tier.discountPct}% staffel, ${tierLabel(s.tier)})`
              : " (geen staffelkorting)"}{" "}
            = <strong>{euro(s.endCustomerCents)}</strong> eindklant per jaar. Alles recurring zolang de klant blijft.
          </div>

          {/* De split — jouw commissie is het hoofdgetal */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Eindklant betaalt / jaar" value={euro(s.endCustomerCents)} />
            <Stat
              label={`Reseller / jaar (${resellerPct}%)`}
              value={euro(s.resellerCents)}
              accent="navy"
            />
            <Stat
              label={`Jouw commissie / jaar (${amPct}%)`}
              value={euro(s.amCents)}
              accent="orange"
              hero
              hint="recurring — onderaan de streep"
            />
            <Stat label="Dicteren netto / jaar" value={euro(s.dicterenCents)} />
          </div>

          {/* Staffel-tabel: bottom-line per volume bij deze verdeling */}
          <div className="brand-card overflow-hidden p-0">
            <div className="border-b border-[color:var(--border-soft)] px-4 py-3 text-xs font-semibold text-[color:var(--text-muted)]">
              Jouw bottom-line per volume — bij reseller {resellerPct}% / jij {amPct}%
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[0.6875rem] uppercase tracking-wide text-[color:var(--text-muted)]">
                    <th className="px-4 py-2 font-semibold">Seats</th>
                    <th className="px-4 py-2 font-semibold">Per seat</th>
                    <th className="px-4 py-2 font-semibold">Eindklant / jr</th>
                    <th className="px-4 py-2 font-semibold">Reseller / jr</th>
                    <th className="px-4 py-2 font-semibold text-[color:var(--orange)]">
                      Jij / jr
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MILESTONES.map((m) => {
                    const row = splitFor(m, resellerPct);
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
                        <td className="px-4 py-2 text-[color:var(--navy)]">
                          {euro(row.resellerCents)}
                        </td>
                        <td className="px-4 py-2 font-bold text-[color:var(--orange)]">
                          {euro(row.amCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[color:var(--border-soft)] px-4 py-2 text-[0.6875rem] text-[color:var(--text-soft)]">
              Meer seats = lagere per-seat via de staffel, maar grotere pool. De
              gemarkeerde rij is jouw huidige staffel. Schuif de verdeling om het
              tussen jou en de reseller af te wegen.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  hint,
  hero,
}: {
  label: string;
  value: string;
  accent?: "orange" | "navy";
  hint?: string;
  hero?: boolean;
}) {
  const color =
    accent === "orange"
      ? "var(--orange)"
      : accent === "navy"
        ? "var(--navy)"
        : "var(--text)";
  return (
    <div
      className="brand-card p-4"
      style={hero ? { boxShadow: "0 0 0 2px var(--orange)" } : undefined}
    >
      <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
        {label}
      </div>
      <div
        className={`mt-1 font-bold tracking-tight ${hero ? "text-3xl" : "text-2xl"}`}
        style={{ color }}
      >
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
