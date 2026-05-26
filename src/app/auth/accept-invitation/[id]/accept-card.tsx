"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInvitationCard({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organization/invitations/${invitationId}/accept`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Accepteren mislukt.");
        setSubmitting(false);
        return;
      }
      router.push("/account/licenses?welcome=1");
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
      setSubmitting(false);
    }
  }

  async function decline() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organization/invitations/${invitationId}/reject`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Weigeren mislukt.");
        setSubmitting(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-7 grid gap-3">
      <button
        onClick={accept}
        disabled={submitting}
        className="btn btn-primary disabled:opacity-50"
      >
        {submitting ? "Bezig…" : "Uitnodiging accepteren"}
      </button>
      <button
        onClick={decline}
        disabled={submitting}
        className="btn btn-secondary disabled:opacity-50"
      >
        Weigeren
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
