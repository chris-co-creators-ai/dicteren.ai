"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type Props = {
  orderId: string;
  reference: string;
  status: string;
  hasPayment: boolean;
};

/**
 * Admin-knop voor een betaald-maar-pending order (gemiste webhook). Toont alleen
 * bij status=pending met een Mollie payment-id. Re-triggert de idempotente
 * webhook → fulfill + mail + subscription + commissie via dezelfde code.
 */
export function FulfillButton({ orderId, reference, status, hasPayment }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (status !== "pending" || !hasPayment) return null;

  async function submit() {
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
      method: "POST",
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Verwerken mislukt.");
      return;
    }
    setDone(true);
    startTransition(() => router.refresh());
    setTimeout(() => {
      setOpen(false);
      setDone(false);
    }, 1500);
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Order alsnog verwerken"
        title="Betaling opnieuw bij Mollie controleren en verwerken"
        className="inline-flex rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--green)]"
      >
        <RefreshCw className="size-3.5" strokeWidth={2} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Order alsnog verwerken</h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Controleert de betaling van <strong>{reference}</strong> opnieuw bij
              Mollie. Is die betaald, dan worden de licentie(s), de welkomstmail en
              het abonnement alsnog aangemaakt. Idempotent — dubbel klikken kan geen
              kwaad.
            </p>

            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {done && (
              <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Verwerkt. Ververs zo nodig de lijst.
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="btn btn-secondary btn-sm"
              >
                Annuleren
              </button>
              <button
                onClick={submit}
                disabled={submitting || done}
                className="btn btn-primary btn-sm"
              >
                {submitting ? "Bezig…" : done ? "Klaar" : "Verwerken"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
