"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AffiliateCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [commissionType, setCommissionType] = useState<
    "percentage" | "fixed_per_seat"
  >("percentage");
  const [commissionPct, setCommissionPct] = useState(20);
  const [commissionFixedCents, setCommissionFixedCents] = useState(2000);
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okCode, setOkCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOkCode(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          contactEmail,
          commissionType,
          commissionPct: commissionType === "percentage" ? commissionPct : 0,
          commissionFixedCents:
            commissionType === "fixed_per_seat" ? commissionFixedCents : 0,
          payoutMethod,
          internalNotes: notes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmaken mislukt.");
        setSubmitting(false);
        return;
      }
      setOkCode(data.affiliate.code);
      setName("");
      setContactEmail("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Aanmaken mislukt.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-xs font-semibold">Naam</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Reseller B.V."
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold">Contact-email</span>
        <input
          required
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="input"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold">Commissie-type</span>
        <select
          value={commissionType}
          onChange={(e) =>
            setCommissionType(
              e.target.value as "percentage" | "fixed_per_seat",
            )
          }
          className="input"
        >
          <option value="percentage">Percentage van order</option>
          <option value="fixed_per_seat">Vast bedrag per seat</option>
        </select>
      </label>
      {commissionType === "percentage" ? (
        <label className="grid gap-1">
          <span className="text-xs font-semibold">Percentage (0-100)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={commissionPct}
            onChange={(e) => setCommissionPct(Number(e.target.value) || 0)}
            className="input"
          />
        </label>
      ) : (
        <label className="grid gap-1">
          <span className="text-xs font-semibold">Cents per seat</span>
          <input
            type="number"
            min={0}
            value={commissionFixedCents}
            onChange={(e) =>
              setCommissionFixedCents(Number(e.target.value) || 0)
            }
            className="input"
          />
        </label>
      )}
      <label className="grid gap-1">
        <span className="text-xs font-semibold">Payout-methode</span>
        <input
          value={payoutMethod}
          onChange={(e) => setPayoutMethod(e.target.value)}
          className="input"
          placeholder="bank / factuur / paypal"
        />
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-xs font-semibold">Interne notitie</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input min-h-[60px]"
          placeholder="Voor admin-gebruik"
        />
      </label>

      {error && (
        <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {okCode && (
        <div className="sm:col-span-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Affiliate aangemaakt. Referral-code: <strong>{okCode}</strong>
        </div>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting ? "Bezig…" : "Affiliate aanmaken"}
        </button>
      </div>
    </form>
  );
}
