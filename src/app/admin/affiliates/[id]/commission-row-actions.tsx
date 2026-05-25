"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CommissionRowActions({
  affiliateId,
  commissionId,
  status,
}: {
  affiliateId: string;
  commissionId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function setStatus(
    next: "payable" | "paid" | "voided",
    paidReference?: string,
  ) {
    setError(null);
    const res = await fetch(
      `/api/admin/affiliates/${affiliateId}/commission/${commissionId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next, paidReference }),
      },
    );
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Update mislukt.");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (status === "pending") {
    return (
      <div className="flex justify-end gap-2 text-[0.6875rem]">
        <button
          onClick={() => setStatus("payable")}
          disabled={pending}
          className="font-semibold text-blue-600 hover:underline"
        >
          Markeer uitbetaalbaar
        </button>
        <button
          onClick={() => setStatus("voided")}
          disabled={pending}
          className="font-semibold text-muted-foreground hover:underline"
        >
          Voiden
        </button>
        {error && <span className="text-red-700">{error}</span>}
      </div>
    );
  }
  if (status === "payable") {
    return (
      <div className="flex justify-end gap-2 text-[0.6875rem]">
        <button
          onClick={() => {
            const ref = window.prompt("Factuur- of payout-referentie?");
            if (ref === null) return;
            setStatus("paid", ref || undefined);
          }}
          disabled={pending}
          className="font-semibold text-green-700 hover:underline"
        >
          Markeer betaald
        </button>
        {error && <span className="text-red-700">{error}</span>}
      </div>
    );
  }
  return null;
}
