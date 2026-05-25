"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreatePartnerModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [commissionType, setCommissionType] = useState<
    "percentage" | "fixed_per_seat"
  >("percentage");
  const [commissionPct, setCommissionPct] = useState(20);
  const [commissionFixedCents, setCommissionFixedCents] = useState(2000);
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedCode(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          contactEmail,
          contactPhone: contactPhone || null,
          commissionType,
          commissionPct: commissionType === "percentage" ? commissionPct : 0,
          commissionFixedCents:
            commissionType === "fixed_per_seat" ? commissionFixedCents : 0,
          payoutMethod,
          payoutDetails: payoutDetails ? { raw: payoutDetails } : null,
          internalNotes: notes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmaken mislukt.");
        setSubmitting(false);
        return;
      }
      setCreatedCode(data.affiliate.code);
      setSubmitting(false);
    } catch {
      setError("Aanmaken mislukt — netwerkprobleem?");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-xl font-bold">Nieuwe affiliate-partner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Maak een reseller aan met een unieke affiliate-code en commissie-
          afspraak. De code is meteen bruikbaar in een referral-link.
        </p>

        {createdCode ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-semibold uppercase text-green-800">
              Partner aangemaakt
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-green-900">
              {createdCode}
            </div>
            <div className="mt-3 break-all rounded-md bg-white p-3 font-mono text-xs">
              https://www.dicteren.ai/zakelijk/start?ref={createdCode}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onCreated}
                className="btn btn-primary"
              >
                Sluiten en lijst verversen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Naam reseller" required>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Reseller B.V."
              />
            </Field>
            <Field label="Contact-email" required>
              <input
                required
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Telefoon">
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input"
                placeholder="+31 …"
              />
            </Field>
            <Field label="Commissie-type" required>
              <select
                value={commissionType}
                onChange={(e) =>
                  setCommissionType(
                    e.target.value as "percentage" | "fixed_per_seat",
                  )
                }
                className="input"
              >
                <option value="percentage">% van order</option>
                <option value="fixed_per_seat">Vast bedrag per seat</option>
              </select>
            </Field>
            {commissionType === "percentage" ? (
              <Field label="Percentage (0-100)" required>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={commissionPct}
                  onChange={(e) =>
                    setCommissionPct(Number(e.target.value) || 0)
                  }
                  className="input"
                />
              </Field>
            ) : (
              <Field label="Cents per seat" required>
                <input
                  type="number"
                  min={0}
                  required
                  value={commissionFixedCents}
                  onChange={(e) =>
                    setCommissionFixedCents(Number(e.target.value) || 0)
                  }
                  className="input"
                />
              </Field>
            )}
            <Field label="Payout-methode">
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="input"
              >
                <option value="bank">Bankoverschrijving</option>
                <option value="factuur">Op factuur</option>
                <option value="paypal">PayPal</option>
                <option value="anders">Anders</option>
              </select>
            </Field>
            <Field label="Payout-gegevens">
              <input
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                className="input"
                placeholder="IBAN of paypal-mail"
              />
            </Field>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold">Interne notitie</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[80px]"
                placeholder="Voor admin-gebruik — wie heeft contact, deal-context, etc."
              />
            </label>

            {error && (
              <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Aanmaken…" : "Partner aanmaken"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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
      <span className="text-xs font-semibold">
        {label}{" "}
        {required && <span className="text-[color:var(--orange)]">*</span>}
      </span>
      {children}
    </label>
  );
}
