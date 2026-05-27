"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

type Payout = {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateContactEmail: string;
  period: string;
  totalCents: number;
  commissionCount: number;
  status: string;
  sepaBatchRef: string | null;
  scheduledAt: string;
  paidAt: string | null;
};

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PayoutsClient({ payouts }: { payouts: Payout[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  async function markPaid(payout: Payout) {
    const ref = window.prompt(
      `SEPA-batch-referentie voor ${payout.affiliateName} — ${eur(payout.totalCents)}:`,
      payout.sepaBatchRef ?? "",
    );
    if (ref === null) return;
    setBusy(payout.id);
    const res = await fetch(`/api/admin/affiliates/payouts/${payout.id}/mark-paid`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sepaBatchRef: ref.trim() || null }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Mark-paid mislukt.");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (payouts.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
        Nog geen payouts gegenereerd. De cron draait op de 25e van elke maand.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-[0.05em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Affiliate</th>
            <th className="px-4 py-3">Periode</th>
            <th className="px-4 py-3 text-right">Bedrag</th>
            <th className="px-4 py-3 text-center">#</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Batch-ref</th>
            <th className="px-4 py-3">Datums</th>
            <th className="px-4 py-3 text-right">Actie</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                <div className="font-medium">{p.affiliateName}</div>
                <div className="text-xs text-muted-foreground">
                  {p.affiliateContactEmail}
                </div>
              </td>
              <td className="px-4 py-3">{p.period}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">
                {eur(p.totalCents)}
              </td>
              <td className="px-4 py-3 text-center">{p.commissionCount}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    p.status === "paid"
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800"
                      : p.status === "failed"
                        ? "rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800"
                        : "rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800"
                  }
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {p.sepaBatchRef ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                <div>scheduled {formatDate(p.scheduledAt)}</div>
                {p.paidAt && <div>paid {formatDate(p.paidAt)}</div>}
              </td>
              <td className="px-4 py-3 text-right">
                {p.status === "scheduled" || p.status === "processing" ? (
                  <button
                    onClick={() => markPaid(p)}
                    disabled={busy === p.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <Check className="size-3" />
                    Mark paid
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
