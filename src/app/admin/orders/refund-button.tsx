"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

type Props = {
  orderId: string;
  reference: string;
  amount: string;
  status: string;
};

/**
 * Admin refund-knop voor /admin/orders. Toont alleen bij status=paid.
 * Bij submit: POST /api/admin/orders/{id}/refund met optionele reason.
 * Default = volledige refund (geen amountCents → Mollie default = restant).
 * Onze license/order status wordt door de Mollie refund-webhook bijgewerkt.
 */
export function RefundButton({ orderId, reference, amount, status }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (status !== "paid") return null;

  async function submit() {
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: reason.trim() || undefined }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Refund mislukt.");
      return;
    }
    setDone(true);
    startTransition(() => router.refresh());
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      setReason("");
    }, 1500);
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Refund order"
        title="Refund deze order"
        className="inline-flex rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--red)]"
      >
        <Undo2 className="size-3.5" strokeWidth={2} />
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
            <h2 className="text-lg font-bold">Order refunden</h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Volledige refund van <strong>{reference}</strong> ({amount}). Mollie
              start het refund-proces; status komt via webhook binnen
              (SEPA-betalingen kunnen 1-2 werkdagen duren).
            </p>

            <label className="mt-5 grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Reden (optioneel, wordt naar Mollie gestuurd)
              </span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={120}
                placeholder="bv. Restitutie volgens art. 6:230o BW"
                className="input"
                disabled={submitting || done}
              />
            </label>

            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {done && (
              <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Refund gestart bij Mollie.
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
                style={{ background: "var(--red)" }}
              >
                {submitting ? "Bezig…" : done ? "Gestart" : "Refund starten"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
