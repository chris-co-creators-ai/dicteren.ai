"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Affiliate = {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  commissionType: string;
  commissionPct: number;
  commissionFixedCents: number;
  payoutMethod: string | null;
  internalNotes: string | null;
};

type Props = {
  affiliate: Affiliate;
  onClose: () => void;
  onSaved: () => void;
};

export function EditAffiliateModal({ affiliate, onClose, onSaved }: Props) {
  const [name, setName] = useState(affiliate.name);
  const [contactEmail, setContactEmail] = useState(affiliate.contactEmail);
  const [contactPhone, setContactPhone] = useState(affiliate.contactPhone ?? "");
  const [status, setStatus] = useState(affiliate.status);
  const [commissionType, setCommissionType] = useState<
    "percentage" | "fixed_per_seat"
  >(affiliate.commissionType as "percentage" | "fixed_per_seat");
  const [commissionPct, setCommissionPct] = useState(affiliate.commissionPct);
  const [commissionFixedCents, setCommissionFixedCents] = useState(
    affiliate.commissionFixedCents,
  );
  const [payoutMethod, setPayoutMethod] = useState(
    affiliate.payoutMethod ?? "bank",
  );
  const [internalNotes, setInternalNotes] = useState(
    affiliate.internalNotes ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          contactEmail,
          contactPhone: contactPhone || null,
          status,
          commissionType,
          commissionPct: commissionType === "percentage" ? commissionPct : 0,
          commissionFixedCents:
            commissionType === "fixed_per_seat" ? commissionFixedCents : 0,
          payoutMethod: payoutMethod || null,
          internalNotes: internalNotes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Opslaan mislukt.");
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch {
      setError("Opslaan mislukt.");
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

        <h2 className="text-xl font-bold">Affiliate bewerken</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Code <span className="font-mono">{affiliate.code}</span> kun je niet
          wijzigen — die is permanent gekoppeld aan referrals.
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Naam">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Contact-email">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Telefoon">
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>
          <Field label="Commissie-type">
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
              <option value="fixed_per_seat">Vast per seat</option>
            </select>
          </Field>
          {commissionType === "percentage" ? (
            <Field label="Percentage (0-100)">
              <input
                type="number"
                min={0}
                max={100}
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
          ) : (
            <Field label="Cents per seat">
              <input
                type="number"
                min={0}
                value={commissionFixedCents}
                onChange={(e) =>
                  setCommissionFixedCents(Number(e.target.value) || 0)
                }
                className="input"
              />
            </Field>
          )}
          <Field label="Payout-methode">
            <input
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className="input"
            />
          </Field>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-semibold">Interne notitie</span>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="input min-h-[80px]"
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
              {submitting ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}
