"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Billing = "month" | "quarter" | "year";

const PLANS: Record<
  Billing,
  { price: number; sub: string; save?: string; label: string }
> = {
  month: { price: 12, sub: "per maand", label: "Maandelijks" },
  quarter: { price: 30, sub: "per kwartaal", save: "bespaar 17%", label: "Per kwartaal" },
  year: { price: 96, sub: "per jaar", save: "bespaar 33%", label: "Per jaar" },
};

const COMPARE: { feature: string; beta: boolean | string; persoonlijk: boolean | string; zakelijk: boolean | string }[] = [
  { feature: "Lokaal Nederlands V3-model", beta: true, persoonlijk: true, zakelijk: true },
  { feature: "Mac & Windows", beta: true, persoonlijk: true, zakelijk: true },
  { feature: "Aantal apparaten", beta: "1", persoonlijk: "2", zakelijk: "per gebruiker" },
  { feature: "Nieuwe modelversies", beta: false, persoonlijk: true, zakelijk: true },
  { feature: "Prioriteits-support", beta: false, persoonlijk: true, zakelijk: true },
  { feature: "Admin-dashboard", beta: false, persoonlijk: false, zakelijk: true },
  { feature: "Seat-management", beta: false, persoonlijk: false, zakelijk: true },
  { feature: "Volumekorting vanaf 5 seats", beta: false, persoonlijk: false, zakelijk: true },
  { feature: "Facturatie & inkoop-PO", beta: false, persoonlijk: false, zakelijk: true },
];

const SEAT_BASE_PRICE = 84;
const CUSTOM_QUOTE_FROM = 50;

function getSeatDiscount(seats: number): number | "custom" {
  if (seats >= CUSTOM_QUOTE_FROM) return "custom";
  if (seats >= 25) return 0.2;
  if (seats >= 10) return 0.15;
  if (seats >= 5) return 0.1;
  return 0;
}

/** Volgende staffel-mijlpaal — voor "Nog X seats voor 15%" nudge. */
function nextTier(
  seats: number,
): { atSeats: number; pct: number } | null {
  if (seats < 5) return { atSeats: 5, pct: 10 };
  if (seats < 10) return { atSeats: 10, pct: 15 };
  if (seats < 25) return { atSeats: 25, pct: 20 };
  return null;
}

export default function PrijzenPage() {
  const [billing, setBilling] = useState<Billing>("year");
  const [seats, setSeats] = useState(8);

  const discount = getSeatDiscount(seats);
  const annualPerSeat =
    discount === "custom" ? null : Math.round(SEAT_BASE_PRICE * (1 - discount));
  const total = annualPerSeat ? annualPerSeat * seats : null;
  const currentPlan = PLANS[billing];

  return (
    <>
      {/* Header */}
      <section className="px-4 pt-12 pb-6 text-center sm:px-6 sm:pt-16 sm:pb-8 lg:px-14 lg:pt-20">
        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Een eerlijke prijs zonder verrassingen.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
          Probeer Dicteren.ai 14 dagen gratis. Daarna kies je een plan dat
          past — of je stopt. Geen creditcard nodig om te starten.
        </p>
      </section>

      {/* Billing toggle */}
      <section className="flex justify-center px-4 sm:px-6 lg:px-14">
        <div
          role="tablist"
          aria-label="Facturatiefrequentie"
          className="inline-flex w-full max-w-md flex-wrap items-stretch justify-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-white p-1 sm:w-auto sm:flex-nowrap"
        >
          {(Object.entries(PLANS) as [Billing, (typeof PLANS)[Billing]][]).map(
            ([key, plan]) => (
              <button
                key={key}
                role="tab"
                aria-selected={billing === key}
                onClick={() => setBilling(key)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-5 sm:py-2.5",
                  billing === key
                    ? "bg-[color:var(--navy)] text-white"
                    : "text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
                )}
              >
                {plan.label}
                {plan.save && billing === key && (
                  <span className="rounded-full bg-[color:var(--orange)] px-2 py-0.5 text-[0.6875rem] font-bold text-white">
                    {plan.save}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      </section>

      {/* Plans grid */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-14 lg:py-16">
        <div className="mx-auto grid max-w-5xl gap-4 sm:gap-5 lg:grid-cols-[1fr_1.05fr_1fr]">
          {/* Trial */}
          <article className="brand-card p-7">
            <h3 className="text-lg font-semibold">Gratis proberen</h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Eerst kijken of het bevalt
            </p>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight">€0</span>
              <span className="text-sm text-[color:var(--text-muted)]">
                14 dagen
              </span>
            </div>
            <Link
              href="/auth/sign-up?next=/trial/start"
              className="btn btn-secondary mt-5 w-full"
            >
              Start 14 dagen gratis
            </Link>
            <ul className="mt-5 flex flex-col gap-2.5">
              {[
                "Volledige dicteer-app",
                "Mac & Windows",
                "Nederlands V3-model",
                "Geldig 14 dagen",
                "1 apparaat",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[color:var(--text)]"
                >
                  <Check
                    className="size-4 shrink-0 translate-y-0.5"
                    strokeWidth={2.4}
                    style={{ color: "var(--green)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          {/* Persoonlijk - recommended */}
          <article
            className="brand-card relative p-7"
            style={{
              border: "2px solid var(--orange)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <span
              className="absolute -top-3.5 left-6 rounded-full px-3 py-1 text-[0.6875rem] font-bold tracking-[0.04em] text-white"
              style={{ background: "var(--orange)" }}
            >
              AANBEVOLEN
            </span>
            <h3 className="text-lg font-semibold">Persoonlijk</h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Voor individueel gebruik
            </p>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight">
                €{currentPlan.price}
              </span>
              <span className="text-sm text-[color:var(--text-muted)]">
                {currentPlan.sub}
              </span>
            </div>
            {billing === "year" && (
              <p className="mt-1 text-xs font-semibold text-[color:var(--orange-600)]">
                = €8/maand · jaarlijks afgerekend
              </p>
            )}
            <Link
              href="/auth/sign-up?next=/trial/start"
              className="btn btn-primary mt-5 w-full"
            >
              Start gratis trial
            </Link>
            <ul className="mt-5 flex flex-col gap-2.5">
              {[
                "Alles uit de gratis proefperiode",
                "2 apparaten per licentie",
                "Nieuwe modelversies",
                "Prioriteits-support",
                "Geluiden en sneltoetsen",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[color:var(--text)]"
                >
                  <Check
                    className="size-4 shrink-0 translate-y-0.5"
                    strokeWidth={2.4}
                    style={{ color: "var(--green)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          {/* Zakelijk — met ingebouwde seat-calculator */}
          <article
            className="brand-card relative overflow-hidden p-7 text-white"
            style={{
              background: "var(--navy)",
              borderColor: "var(--navy)",
            }}
          >
            <h3 className="text-lg font-semibold">Zakelijk</h3>
            <p className="mt-1 text-sm text-[#9db1d6]">
              Voor teams en organisaties · aftrekbaar
            </p>

            {/* Live prijs op basis van seats */}
            {discount === "custom" ? (
              <>
                <div className="mt-4 text-3xl font-bold leading-tight tracking-tight">
                  Offerte op maat
                </div>
                <p className="mt-1 text-sm text-[#9db1d6]">
                  Vanaf {CUSTOM_QUOTE_FROM} gebruikers
                </p>
              </>
            ) : (
              <>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight">
                    €{annualPerSeat}
                  </span>
                  <span className="text-sm text-[#9db1d6]">
                    per gebruiker / jaar
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9db1d6]">
                  €{(total ?? 0).toLocaleString("nl-NL")} totaal voor {seats}{" "}
                  {seats === 1 ? "gebruiker" : "gebruikers"} · excl. btw
                </p>
                {typeof discount === "number" && discount > 0 && (
                  <p
                    className="mt-1 text-xs font-semibold"
                    style={{ color: "var(--aqua)" }}
                  >
                    {Math.round(discount * 100)}% volumekorting actief
                  </p>
                )}
              </>
            )}

            {/* Seat-stepper + slider */}
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="seat-input"
                  className="text-xs font-semibold text-[#9db1d6]"
                >
                  Aantal gebruikers
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    className="grid size-7 place-items-center rounded-full bg-white/10 text-base font-bold leading-none text-white hover:bg-white/20"
                    aria-label="Minder gebruikers"
                  >
                    −
                  </button>
                  <input
                    id="seat-input"
                    type="number"
                    min={1}
                    max={60}
                    value={seats}
                    onChange={(e) =>
                      setSeats(
                        Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                    className="w-12 rounded-md bg-white/10 px-1.5 py-1 text-center text-sm font-bold text-white outline-none focus:bg-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSeats((s) => Math.min(60, s + 1))}
                    className="grid size-7 place-items-center rounded-full bg-white/10 text-base font-bold leading-none text-white hover:bg-white/20"
                    aria-label="Meer gebruikers"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="mt-2 w-full"
                style={{ accentColor: "var(--aqua)" }}
              />
              {nextTier(seats) && discount !== "custom" && (
                <p className="mt-1 text-[0.6875rem] text-[#9db1d6]">
                  Nog {nextTier(seats)!.atSeats - seats}{" "}
                  {nextTier(seats)!.atSeats - seats === 1 ? "seat" : "seats"} →{" "}
                  {nextTier(seats)!.pct}% korting
                </p>
              )}
            </div>

            {/* Smart CTA: <50 = afrekenen, 50+ = offerte */}
            {discount === "custom" ? (
              <Link
                href="/contact?onderwerp=zakelijke-offerte"
                className="btn mt-5 w-full"
                style={{ background: "var(--aqua)", color: "var(--navy)" }}
              >
                <Send className="size-3.5" strokeWidth={2.2} />
                Vraag offerte aan
              </Link>
            ) : (
              <Link
                href={`/zakelijk/start?plan=org-yearly&seats=${seats}`}
                className="btn mt-5 w-full"
                style={{ background: "var(--aqua)", color: "var(--navy)" }}
              >
                Start zakelijke licenties
              </Link>
            )}

            <ul className="mt-5 flex flex-col gap-2.5">
              {[
                "Teamlicenties · 2 apparaten per gebruiker",
                "Admin-dashboard met seat-management",
                "Volumekorting vanaf 5 gebruikers",
                "Facturatie met PO-nummer",
                "Prioriteits-support",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[#dde7f7]"
                >
                  <Check
                    className="size-4 shrink-0 translate-y-0.5"
                    strokeWidth={2.4}
                    style={{ color: "var(--aqua)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* Compare */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Wat zit erin?
        </h2>

        {/* Desktop table */}
        <div className="mx-auto hidden max-w-4xl overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white shadow-sm lg:block">
          <table className="w-full border-separate border-spacing-0">
            <thead style={{ background: "var(--bg-deep)" }}>
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-[color:var(--text-muted)]">
                  Functies
                </th>
                {(["Trial", "Persoonlijk", "Zakelijk"] as const).map((c) => (
                  <th
                    key={c}
                    className="px-4 py-4 text-center text-sm font-bold"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr
                  key={row.feature}
                  className={cn(
                    "border-t",
                    i > 0 ? "[&_td]:border-t [&_td]:border-[color:var(--border-soft)]" : "",
                  )}
                >
                  <td className="px-4 py-4 text-sm font-medium">
                    {row.feature}
                  </td>
                  <CompareCell value={row.beta} />
                  <CompareCell value={row.persoonlijk} />
                  <CompareCell value={row.zakelijk} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet: stacked cards per plan */}
        <div className="mx-auto grid max-w-2xl gap-4 lg:hidden">
          {(["Trial", "Persoonlijk", "Zakelijk"] as const).map((plan) => (
            <div key={plan} className="brand-card p-5">
              <h3 className="mb-3 text-base font-bold">{plan}</h3>
              <ul className="flex flex-col gap-2.5">
                {COMPARE.map((row) => {
                  const key = (plan === "Trial"
                    ? "beta"
                    : plan === "Persoonlijk"
                      ? "persoonlijk"
                      : "zakelijk") as "beta" | "persoonlijk" | "zakelijk";
                  const value = row[key];
                  return (
                    <li
                      key={row.feature}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-[color:var(--text)]">
                        {row.feature}
                      </span>
                      <span className="shrink-0 font-medium">
                        {value === true ? (
                          <Check
                            className="size-4"
                            strokeWidth={2.4}
                            style={{ color: "var(--green)" }}
                          />
                        ) : value === false ? (
                          <Minus
                            className="size-4"
                            style={{ color: "var(--text-soft)" }}
                          />
                        ) : (
                          <span className="text-[color:var(--text-muted)]">
                            {value}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function CompareCell({ value }: { value: boolean | string }) {
  return (
    <td className="border-l border-[color:var(--border-soft)] px-4 py-4 text-center text-sm">
      {value === true ? (
        <Check
          className="mx-auto size-4.5"
          strokeWidth={2.4}
          style={{ color: "var(--green)" }}
        />
      ) : value === false ? (
        <span className="text-[color:var(--text-soft)]">·</span>
      ) : (
        value
      )}
    </td>
  );
}
