"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  affiliateId: string;
  affiliateName: string;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateDiscountCodeModal({
  affiliateId,
  affiliateName,
  onClose,
  onCreated,
}: Props) {
  const [type, setType] = useState<"percentage" | "fixed" | "free_months">(
    "percentage",
  );
  const [value, setValue] = useState(10);
  const [appliesTo, setAppliesTo] = useState<
    "consumer" | "organization" | "all"
  >("organization");
  const [minimumSeats, setMinimumSeats] = useState(0);
  const [maxRedemptions, setMaxRedemptions] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedCode(null);
    try {
      const res = await fetch(
        `/api/admin/affiliates/${affiliateId}/discount-codes`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            value,
            appliesTo: appliesTo === "all" ? null : appliesTo,
            minimumSeats: minimumSeats > 0 ? minimumSeats : null,
            maxRedemptions: maxRedemptions > 0 ? maxRedemptions : null,
            validUntil: validUntil || null,
            customCode: customCode || null,
          }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmaken mislukt.");
        setSubmitting(false);
        return;
      }
      setCreatedCode(data.discount.code);
      setSubmitting(false);
    } catch {
      setError("Aanmaken mislukt.");
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

        <h2 className="text-xl font-bold">Discount-code voor {affiliateName}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Klant krijgt korting bij gebruik, en wordt lifetime aan deze affiliate
          gekoppeld.
        </p>

        {createdCode ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-semibold uppercase text-green-800">
              Code aangemaakt
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-green-900">
              {createdCode}
            </div>
            <p className="mt-3 text-xs text-green-800">
              Deel deze code met klanten, of geef ze de pre-fill-link:
            </p>
            <div className="mt-2 break-all rounded-md bg-white p-3 font-mono text-xs">
              https://www.dicteren.ai/zakelijk/start?code={createdCode}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={onCreated} className="btn btn-primary">
                Sluiten en lijst verversen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value as "percentage" | "fixed" | "free_months",
                  )
                }
                className="input"
              >
                <option value="percentage">% korting</option>
                <option value="fixed">Vast bedrag (cents)</option>
                <option value="free_months">Maanden gratis</option>
              </select>
            </Field>
            <Field label="Waarde" required>
              <input
                type="number"
                min={0}
                required
                value={value}
                onChange={(e) => setValue(Number(e.target.value) || 0)}
                className="input"
              />
              <span className="text-[0.6875rem] text-muted-foreground">
                {type === "percentage"
                  ? "0-100"
                  : type === "fixed"
                    ? "cents"
                    : "aantal maanden"}
              </span>
            </Field>
            <Field label="Doelgroep">
              <select
                value={appliesTo}
                onChange={(e) =>
                  setAppliesTo(
                    e.target.value as "consumer" | "organization" | "all",
                  )
                }
                className="input"
              >
                <option value="organization">Alleen zakelijk</option>
                <option value="consumer">Alleen consumer</option>
                <option value="all">Alle</option>
              </select>
            </Field>
            <Field label="Min. seats (0 = geen min)">
              <input
                type="number"
                min={0}
                value={minimumSeats}
                onChange={(e) =>
                  setMinimumSeats(Number(e.target.value) || 0)
                }
                className="input"
              />
            </Field>
            <Field label="Max. gebruik (0 = onbeperkt)">
              <input
                type="number"
                min={0}
                value={maxRedemptions}
                onChange={(e) =>
                  setMaxRedemptions(Number(e.target.value) || 0)
                }
                className="input"
              />
            </Field>
            <Field label="Geldig tot (optioneel)">
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input"
              />
            </Field>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold">
                Aangepaste code (optioneel)
              </span>
              <input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                className="input font-mono"
                placeholder="Anders: AFF-prefix + random suffix"
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
                {submitting ? "Aanmaken…" : "Code aanmaken"}
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
