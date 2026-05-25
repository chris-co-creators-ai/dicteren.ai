"use client";

import { useState } from "react";

type Props = {
  planSlug: string;
  planLabel: string;
  planPriceCents: number;
  planPeriod: string;
  initialSeats: number;
  affiliateCode: string | null;
  defaultBillingEmail: string;
};

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function CheckoutForm({
  planSlug,
  planLabel,
  planPriceCents,
  planPeriod,
  initialSeats,
  affiliateCode,
  defaultBillingEmail,
}: Props) {
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = planPriceCents * seats;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planSlug,
          seats,
          affiliateCode,
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
      <div>
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Plan
        </div>
        <div className="mt-1 text-lg font-bold">{planLabel}</div>
        <div className="text-xs text-[color:var(--text-muted)]">
          {eur(planPriceCents)} per gebruiker / {planPeriod === "monthly" ? "maand" : planPeriod === "quarterly" ? "kwartaal" : "jaar"}
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
            max={49}
            value={seats}
            onChange={(e) =>
              setSeats(Math.min(49, Math.max(1, Number(e.target.value) || 1)))
            }
            className="w-16 rounded-md border border-[color:var(--border-soft)] px-2 py-1 text-center font-bold"
          />
          <button
            type="button"
            onClick={() => setSeats((s) => Math.min(49, s + 1))}
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

      <div className="flex flex-col gap-1 border-t border-[color:var(--border-soft)] pt-4">
        <div className="flex items-center justify-between text-sm text-[color:var(--text-muted)]">
          <span>{seats} × {eur(planPriceCents)}</span>
          <span>{eur(total)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-bold">
          <span>Totaal excl. btw</span>
          <span>{eur(total)}</span>
        </div>
        {affiliateCode && (
          <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
            Affiliate-referentie: {affiliateCode}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {submitting ? "Verbinden met Mollie…" : "Doorgaan naar betalen"}
      </button>

      <p className="text-[0.6875rem] text-[color:var(--text-soft)]">
        Je betaalt {eur(total)} excl. btw. Na succesvolle betaling word je de
        eigenaar van de nieuwe organisatie en kun je teamleden uitnodigen.
      </p>
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
