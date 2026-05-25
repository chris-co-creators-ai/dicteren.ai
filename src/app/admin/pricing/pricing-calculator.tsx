"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type Plan = {
  id: string;
  slug: string;
  label: string;
  customerType: "consumer" | "organization";
  period: "monthly" | "quarterly" | "yearly" | "lifetime";
  priceCents: number;
  isPerSeat: boolean;
  currency: string;
};

type DiscountCode = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_months";
  value: number;
  appliesTo: "consumer" | "organization" | null;
  minimumSeats: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  affiliateId: string | null;
};

type Affiliate = {
  id: string;
  code: string;
  name: string;
  status: string;
  commissionType: "percentage" | "fixed_per_seat";
  commissionPct: number;
  commissionFixedCents: number;
};

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Volume-staffel uit /prijzen — gehouden in sync. */
function volumeDiscount(seats: number, customerType: string): number {
  if (customerType !== "organization") return 0;
  if (seats >= 50) return 0; // maatwerk
  if (seats >= 25) return 0.2;
  if (seats >= 10) return 0.15;
  if (seats >= 5) return 0.1;
  return 0;
}

const MOLLIE_FEE_PCT = 0.029; // ~2.9% gemiddeld over methodes (iDEAL 0.39%, kaart ~1.8%, sepa ~0.5%)
const MOLLIE_FEE_FIXED_CENTS = 25; // €0.25 per transactie
const TARGET_NET_MARGIN = 0.25;

type Calc = {
  listAmountCents: number;
  volumeDiscountCents: number;
  afterVolumeCents: number;
  discountAmountCents: number;
  endCustomerAmountCents: number;
  mollieFeeCents: number;
  affiliateCommissionCents: number;
  accountManagerCommissionCents: number;
  dicterenNetCents: number;
  netMarginPct: number;
  warning: string | null;
};

function calculate(args: {
  plan: Plan;
  seats: number;
  discount: DiscountCode | null;
  affiliate: Affiliate | null;
  accountManagerPct: number;
}): Calc {
  const { plan, seats, discount, affiliate, accountManagerPct } = args;
  const effSeats = plan.isPerSeat ? Math.max(1, seats) : 1;
  const listAmountCents = plan.priceCents * effSeats;

  const vDisc = volumeDiscount(effSeats, plan.customerType);
  const volumeDiscountCents = Math.round(listAmountCents * vDisc);
  const afterVolumeCents = listAmountCents - volumeDiscountCents;

  let discountAmountCents = 0;
  if (discount) {
    if (discount.type === "percentage") {
      discountAmountCents = Math.round(
        (afterVolumeCents * discount.value) / 100,
      );
    } else if (discount.type === "fixed") {
      discountAmountCents = Math.min(discount.value, afterVolumeCents);
    }
    // free_months → geen direct kortingsbedrag (subscription startDate-shift)
  }
  const endCustomerAmountCents = Math.max(
    0,
    afterVolumeCents - discountAmountCents,
  );

  // Mollie fees op het ontvangen bedrag
  const mollieFeeCents =
    Math.round(endCustomerAmountCents * MOLLIE_FEE_PCT) +
    (endCustomerAmountCents > 0 ? MOLLIE_FEE_FIXED_CENTS : 0);

  // Affiliate commissie — berekend op het BETAALDE bedrag (zelfde regel als
  // recordCommission in lib/services/affiliate.ts)
  let affiliateCommissionCents = 0;
  if (affiliate) {
    if (affiliate.commissionType === "percentage") {
      affiliateCommissionCents = Math.round(
        (endCustomerAmountCents * affiliate.commissionPct) / 100,
      );
    } else {
      affiliateCommissionCents = affiliate.commissionFixedCents * effSeats;
    }
  }

  // Account-manager commissie op betaalde bedrag
  const accountManagerCommissionCents = Math.round(
    (endCustomerAmountCents * accountManagerPct) / 100,
  );

  const dicterenNetCents =
    endCustomerAmountCents -
    mollieFeeCents -
    affiliateCommissionCents -
    accountManagerCommissionCents;

  const netMarginPct =
    endCustomerAmountCents > 0
      ? dicterenNetCents / endCustomerAmountCents
      : 0;

  let warning: string | null = null;
  if (endCustomerAmountCents === 0) {
    warning = "Eindklantprijs is €0 — geen marge mogelijk.";
  } else if (dicterenNetCents < 0) {
    warning = "Kosten zijn hoger dan opbrengst — Dicteren verliest geld.";
  } else if (netMarginPct < TARGET_NET_MARGIN) {
    warning = `Marge ${(netMarginPct * 100).toFixed(1)}% < doel 25% — pas commissies of korting aan.`;
  }

  return {
    listAmountCents,
    volumeDiscountCents,
    afterVolumeCents,
    discountAmountCents,
    endCustomerAmountCents,
    mollieFeeCents,
    affiliateCommissionCents,
    accountManagerCommissionCents,
    dicterenNetCents,
    netMarginPct,
    warning,
  };
}

const VOLUME_TIERS = [
  { from: 1, to: 4, pct: 0 },
  { from: 5, to: 9, pct: 10 },
  { from: 10, to: 24, pct: 15 },
  { from: 25, to: 49, pct: 20 },
  { from: 50, to: null as number | null, pct: null as number | null },
] as const;

export function PricingCalculator({
  plans,
  discountCodes,
  affiliates,
}: {
  plans: Plan[];
  discountCodes: DiscountCode[];
  affiliates: Affiliate[];
}) {
  const [activePlanId, setActivePlanId] = useState<string>(
    plans.find((p) => p.slug === "org-yearly")?.id ?? plans[0]?.id ?? "",
  );
  const [seats, setSeats] = useState(5);
  const [discountId, setDiscountId] = useState<string>("");
  const [discountInputCode, setDiscountInputCode] = useState("");
  const [affiliateId, setAffiliateId] = useState<string>("");
  const [accountManagerPct, setAccountManagerPct] = useState(5);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0];

  // Match code-input via beschikbare codes (case-insensitive).
  const resolvedDiscount = useMemo(() => {
    if (discountId) return discountCodes.find((d) => d.id === discountId) ?? null;
    if (discountInputCode.trim()) {
      const q = discountInputCode.trim().toUpperCase();
      return discountCodes.find((d) => d.code === q) ?? null;
    }
    return null;
  }, [discountId, discountInputCode, discountCodes]);

  // Auto-pick affiliate als gekozen discount er een heeft
  const effectiveAffiliateId =
    affiliateId || (resolvedDiscount?.affiliateId ?? "");
  const resolvedAffiliate =
    affiliates.find((a) => a.id === effectiveAffiliateId) ?? null;

  const calc = useMemo(
    () =>
      activePlan
        ? calculate({
            plan: activePlan,
            seats,
            discount: resolvedDiscount,
            affiliate: resolvedAffiliate,
            accountManagerPct,
          })
        : null,
    [activePlan, seats, resolvedDiscount, resolvedAffiliate, accountManagerPct],
  );

  return (
    <div className="grid gap-6">
      {/* Plans-overview */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Actieve plannen</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isActive = p.id === activePlanId;
            const perMonth =
              p.period === "monthly"
                ? p.priceCents
                : p.period === "quarterly"
                  ? p.priceCents / 3
                  : p.period === "yearly"
                    ? p.priceCents / 12
                    : 0;
            return (
              <button
                key={p.id}
                onClick={() => setActivePlanId(p.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  isActive
                    ? "border-orange-400 bg-orange-50"
                    : "border-[color:var(--border-soft)] bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-muted-foreground">
                    {p.slug}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                      p.customerType === "organization"
                        ? "bg-navy-100 text-navy-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    style={
                      p.customerType === "organization"
                        ? {
                            background: "var(--bg-deep)",
                            color: "var(--navy)",
                          }
                        : {}
                    }
                  >
                    {p.customerType === "organization"
                      ? "Zakelijk"
                      : "Consumer"}
                  </span>
                </div>
                <div className="mt-1 text-base font-bold">{p.label}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight">
                  {eur(p.priceCents)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.period}
                  {p.isPerSeat ? " · per seat" : ""}
                </div>
                {p.period !== "monthly" && p.period !== "lifetime" && (
                  <div className="mt-1 text-[0.6875rem] text-muted-foreground">
                    ≈ {eur(Math.round(perMonth))} / maand
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Volume-staffel referentie */}
      {activePlan?.customerType === "organization" && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4" strokeWidth={2.2} />
            <h3 className="text-sm font-bold">
              Zakelijke volume-staffel (geldt op {activePlan.label})
            </h3>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b text-left">
                <tr>
                  <th className="py-2 pr-4">Seats</th>
                  <th className="py-2 pr-4">Volumekorting</th>
                  <th className="py-2 pr-4">Lijstprijs per seat</th>
                  <th className="py-2">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {VOLUME_TIERS.map((t) => {
                  const isCustom = t.pct === null;
                  const exampleSeats = isCustom ? 50 : t.from;
                  const calc = calculate({
                    plan: activePlan,
                    seats: exampleSeats,
                    discount: null,
                    affiliate: null,
                    accountManagerPct: 0,
                  });
                  const perSeat = calc.afterVolumeCents / exampleSeats;
                  return (
                    <tr key={t.from} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 font-semibold">
                        {t.from}
                        {t.to ? `–${t.to}` : "+"}
                      </td>
                      <td className="py-2 pr-4">
                        {isCustom ? "maatwerk" : `−${t.pct}%`}
                      </td>
                      <td className="py-2 pr-4">
                        {isCustom ? "—" : eur(Math.round(perSeat))}
                      </td>
                      <td className="py-2">
                        {isCustom ? "offerte" : eur(calc.afterVolumeCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Calculator */}
      <section className="grid gap-5 rounded-2xl border bg-card p-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-bold">Calculator</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bereken eindklantprijs en marge voor een specifieke deal. Wijzig de
            invoer en de uitkomst rechts loopt mee.
          </p>

          <div className="mt-5 grid gap-4">
            {activePlan?.isPerSeat && (
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Aantal seats</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={seats}
                  onChange={(e) =>
                    setSeats(
                      Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                    )
                  }
                  className="input"
                />
              </label>
            )}

            <label className="grid gap-1">
              <span className="text-xs font-semibold">Discount-code</span>
              <select
                value={discountId}
                onChange={(e) => {
                  setDiscountId(e.target.value);
                  setDiscountInputCode("");
                }}
                className="input"
              >
                <option value="">— Geen code —</option>
                {discountCodes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} (
                    {d.type === "percentage"
                      ? `-${d.value}%`
                      : d.type === "fixed"
                        ? `-€${(d.value / 100).toFixed(2)}`
                        : `${d.value} mnd gratis`}
                    )
                    {d.affiliateId ? " · reseller" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-1 grid gap-1">
                <span className="text-[0.6875rem] text-muted-foreground">
                  Of typ een code handmatig:
                </span>
                <input
                  type="text"
                  value={discountInputCode}
                  onChange={(e) => {
                    setDiscountInputCode(e.target.value.toUpperCase());
                    setDiscountId("");
                  }}
                  placeholder="bv. RESELLER-A1B2C3"
                  className="input font-mono"
                />
                {discountInputCode && !resolvedDiscount && (
                  <span className="text-[0.6875rem] text-red-700">
                    Code niet gevonden in actieve codes.
                  </span>
                )}
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold">
                Affiliate-partner (extra naast eventueel discount-code)
              </span>
              <select
                value={affiliateId}
                onChange={(e) => setAffiliateId(e.target.value)}
                className="input"
              >
                <option value="">— Geen affiliate —</option>
                {affiliates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code}) ·{" "}
                    {a.commissionType === "percentage"
                      ? `${a.commissionPct}%`
                      : `${eur(a.commissionFixedCents)}/seat`}
                    {a.status !== "active" ? ` · ${a.status}` : ""}
                  </option>
                ))}
              </select>
              {resolvedAffiliate &&
                resolvedDiscount?.affiliateId === resolvedAffiliate.id && (
                  <span className="text-[0.6875rem] text-muted-foreground">
                    ↳ automatisch overgenomen uit discount-code
                  </span>
                )}
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold">
                Account-manager commissie (%)
              </span>
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={accountManagerPct}
                onChange={(e) =>
                  setAccountManagerPct(
                    Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                  )
                }
                className="input"
              />
              <span className="text-[0.6875rem] text-muted-foreground">
                Bonus voor interne account-manager / sales rep
              </span>
            </label>
          </div>
        </div>

        {calc && activePlan && (
          <div className="grid gap-3">
            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
                Plan
              </div>
              <div className="text-base font-bold">{activePlan.label}</div>
              <div className="text-xs text-muted-foreground">
                {activePlan.isPerSeat
                  ? `${seats} seats × ${eur(activePlan.priceCents)}`
                  : eur(activePlan.priceCents)}
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <Row
                  label="Lijstprijs (bruto)"
                  value={eur(calc.listAmountCents)}
                />
                {calc.volumeDiscountCents > 0 && (
                  <Row
                    label="Volumekorting"
                    value={`− ${eur(calc.volumeDiscountCents)}`}
                    accent
                  />
                )}
                <Row
                  label="Na volumekorting"
                  value={eur(calc.afterVolumeCents)}
                />
                {calc.discountAmountCents > 0 && (
                  <Row
                    label={`Discount-code ${resolvedDiscount?.code ?? ""}`}
                    value={`− ${eur(calc.discountAmountCents)}`}
                    accent
                  />
                )}
                <div className="border-t pt-2">
                  <Row
                    label="Eindklant betaalt"
                    value={eur(calc.endCustomerAmountCents)}
                    bold
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
                Marge-opbouw
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <Row
                  label="Mollie-fee (~2.9% + €0.25)"
                  value={`− ${eur(calc.mollieFeeCents)}`}
                  small
                />
                {resolvedAffiliate && (
                  <Row
                    label={`Affiliate (${resolvedAffiliate.name})`}
                    value={`− ${eur(calc.affiliateCommissionCents)}`}
                  />
                )}
                {accountManagerPct > 0 && (
                  <Row
                    label={`Account-manager (${accountManagerPct}%)`}
                    value={`− ${eur(calc.accountManagerCommissionCents)}`}
                  />
                )}
                <div className="border-t pt-2">
                  <Row
                    label="Dicteren netto"
                    value={eur(calc.dicterenNetCents)}
                    bold
                  />
                  <Row
                    label="Netto marge"
                    value={`${(calc.netMarginPct * 100).toFixed(1)}%`}
                    bold
                  />
                </div>
              </div>

              <div
                className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                  calc.warning
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-green-200 bg-green-50 text-green-800"
                }`}
              >
                {calc.warning ? (
                  <AlertTriangle
                    className="size-4 shrink-0"
                    strokeWidth={2.2}
                  />
                ) : (
                  <CheckCircle2
                    className="size-4 shrink-0"
                    strokeWidth={2.2}
                  />
                )}
                <div>
                  {calc.warning ?? (
                    <>
                      Marge boven de 25%-grens — deal is gezond. Dicteren
                      houdt {eur(calc.dicterenNetCents)} over.
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Per-seat breakdown — handig voor sales-gesprek */}
            {activePlan.isPerSeat && (
              <div className="rounded-2xl border bg-card p-5">
                <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
                  Per seat
                </div>
                <div className="mt-2 grid gap-1 text-xs">
                  <Row
                    label="Eindklant per seat"
                    value={eur(
                      Math.round(calc.endCustomerAmountCents / seats),
                    )}
                    small
                  />
                  <Row
                    label="Dicteren-netto per seat"
                    value={eur(
                      Math.round(calc.dicterenNetCents / seats),
                    )}
                    small
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Aannames */}
      <section className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-muted/20 p-4 text-xs text-muted-foreground">
        <div className="font-semibold text-[color:var(--navy)]">
          Aannames in de berekening
        </div>
        <ul className="mt-2 grid gap-1">
          <li>
            • Mollie-fee: ~2,9% transactie + €0,25 vast (gemiddelde over iDEAL,
            kaart, SEPA). Werkelijke fee verschilt per betaalmethode.
          </li>
          <li>
            • Affiliate-commissie volgt de actuele instelling van de gekozen
            affiliate (percentage of vast per seat).
          </li>
          <li>
            • Account-manager-commissie is een handmatig in te voeren bonus voor
            interne sales — wordt nu nog niet automatisch geboekt.
          </li>
          <li>
            • Hosting/infra-kosten zijn niet meegerekend (lokale verwerking →
            verwaarloosbaar per seat).
          </li>
        </ul>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  bold,
  small,
}: {
  label: string;
  value: string;
  accent?: boolean;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${
        small ? "text-xs" : ""
      }`}
    >
      <span
        className={`${bold ? "font-bold" : ""} ${
          accent ? "text-orange-700" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono ${bold ? "font-bold" : ""} ${
          accent ? "text-orange-700" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
