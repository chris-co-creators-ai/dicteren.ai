"use client";

import { useState } from "react";
import {
  perSeatCentsForPeriod,
  businessAmountCents,
  tierForSeats,
  periodLabelNl,
  type BillingPeriod,
  type PricingSnapshot,
} from "@/lib/services/pricingTiers";

type Props = {
  pricing: PricingSnapshot;
  initialPeriod: BillingPeriod;
  initialSeats: number;
  affiliateCode: string | null;
  initialDiscountCode?: string | null;
  defaultBillingEmail: string;
  upgradeFromConsumer?: boolean;
};

const ORG_SLUG: Record<Exclude<BillingPeriod, "lifetime">, string> = {
  monthly: "org-monthly",
  quarterly: "org-quarterly",
  yearly: "org-yearly",
};

const PERIOD_TABS: { period: Exclude<BillingPeriod, "lifetime">; label: string }[] = [
  { period: "monthly", label: "Maand" },
  { period: "quarterly", label: "Kwartaal" },
  { period: "yearly", label: "Jaar" },
];

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function CheckoutForm({
  pricing,
  initialPeriod,
  initialSeats,
  affiliateCode,
  initialDiscountCode,
  defaultBillingEmail,
  upgradeFromConsumer,
}: Props) {
  const [period, setPeriod] = useState<Exclude<BillingPeriod, "lifetime">>(
    initialPeriod === "lifetime" ? "yearly" : initialPeriod,
  );
  const [seats, setSeats] = useState(initialSeats);
  const [organizationName, setOrganizationName] = useState("");
  const [billingEmail, setBillingEmail] = useState(defaultBillingEmail);
  const [vatNumber, setVatNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("NL");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [discountCode, setDiscountCode] = useState(
    initialDiscountCode?.toUpperCase() ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSeats = pricing.customQuoteFrom - 1;
  const isCustom = seats >= pricing.customQuoteFrom;
  const tier = tierForSeats(pricing, seats);
  const perSeatCents = perSeatCentsForPeriod(pricing, seats, period);
  const total = businessAmountCents(pricing, seats, period);
  const periodNl = periodLabelNl(period);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planSlug: ORG_SLUG[period],
          seats,
          affiliateCode,
          discountCode: discountCode || null,
          upgradeFromConsumer: upgradeFromConsumer ?? false,
          billing: {
            organizationName,
            billingEmail,
            vatNumber: vatNumber || null,
            addressLine1,
            addressLine2: addressLine2 || null,
            postalCode,
            city,
            countryCode,
            purchaseOrderNumber: purchaseOrderNumber || null,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Er ging iets mis.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Verbinding mislukt. Probeer opnieuw.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-7 grid gap-5 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6"
    >
      {/* Termijn-keuze */}
      <div>
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Termijn
        </div>
        <div className="mt-2 inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-1">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.period}
              type="button"
              onClick={() => setPeriod(t.period)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                period === t.period
                  ? "bg-[color:var(--navy)] text-white"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-[color:var(--text-muted)]">
          {isCustom ? (
            "Maatwerk-offerte"
          ) : (
            <>
              {eur(perSeatCents)} per gebruiker / {periodNl}
              {tier.discountPct > 0 && (
                <span className="ml-1 font-semibold text-[color:var(--green)]">
                  · {tier.discountPct}% volumekorting
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <Field label="Aantal gebruikers">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            className="grid size-8 place-items-center rounded-full bg-[color:var(--bg)] font-bold"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxSeats}
            value={seats}
            onChange={(e) =>
              setSeats(Math.min(maxSeats, Math.max(1, Number(e.target.value) || 1)))
            }
            className="w-16 rounded-md border border-[color:var(--border-soft)] px-2 py-1 text-center font-bold"
          />
          <button
            type="button"
            onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
            className="grid size-8 place-items-center rounded-full bg-[color:var(--bg)] font-bold"
          >
            +
          </button>
        </div>
      </Field>

      <Field label="Bedrijfsnaam" required>
        <input
          required
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          className="input"
          placeholder="Acme B.V."
        />
      </Field>

      <Field label="Factuur-emailadres" required>
        <input
          required
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
          className="input"
        />
      </Field>

      <Field label="BTW-nummer (optioneel)">
        <input
          value={vatNumber}
          onChange={(e) => setVatNumber(e.target.value)}
          className="input"
          placeholder="NL123456789B01"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Adres" required>
          <input
            required
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className="input"
            placeholder="Straat + nummer"
          />
        </Field>
        <Field label="Adres regel 2">
          <input
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            className="input"
            placeholder="Toevoeging (optioneel)"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Postcode" required>
          <input
            required
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="input"
            placeholder="1234 AB"
          />
        </Field>
        <Field label="Plaats" required>
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Land" required>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="input"
            required
          >
            <option value="NL">Nederland</option>
            <option value="BE">België</option>
            <option value="DE">Duitsland</option>
            <option value="FR">Frankrijk</option>
            <option value="LU">Luxemburg</option>
          </select>
        </Field>
      </div>

      <Field label="PO-nummer (optioneel)">
        <input
          value={purchaseOrderNumber}
          onChange={(e) => setPurchaseOrderNumber(e.target.value)}
          className="input"
          placeholder="Inkoop-referentie van je organisatie"
        />
      </Field>

      <Field label="Kortingscode (optioneel)">
        <input
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
          className="input font-mono"
          placeholder="bv. RESELLER-A1B2C3"
          autoComplete="off"
        />
      </Field>

      <div className="flex flex-col gap-1 border-t border-[color:var(--border-soft)] pt-4">
        {isCustom ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            Vanaf {pricing.customQuoteFrom} gebruikers maken we een offerte op maat.{" "}
            <a href="/contact?onderwerp=zakelijke-offerte" className="font-semibold underline">
              Vraag een offerte aan
            </a>
            .
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-[color:var(--text-muted)]">
              <span>
                {seats} × {eur(perSeatCents)} / {periodNl}
              </span>
              <span>{eur(total)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold">
              <span>Totaal excl. btw · per {periodNl}</span>
              <span>{eur(total)}</span>
            </div>
            {discountCode && (
              <div className="mt-1 text-[0.6875rem] text-[color:var(--green)]">
                Kortingscode {discountCode} wordt op de volgende pagina toegepast.
              </div>
            )}
            {affiliateCode && (
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                Affiliate-referentie: {affiliateCode}
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || isCustom}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {submitting ? "Verbinden met Mollie…" : "Doorgaan naar betalen"}
      </button>

      {!isCustom && (
        <p className="text-[0.6875rem] text-[color:var(--text-soft)]">
          Je betaalt {eur(total)} excl. btw per {periodNl}. Na succesvolle betaling
          word je de eigenaar van de nieuwe organisatie en kun je teamleden
          uitnodigen.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label} {required && <span className="text-[color:var(--orange)]">*</span>}
      </span>
      {children}
    </label>
  );
}
