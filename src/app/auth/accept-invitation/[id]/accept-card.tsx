"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

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
    const result = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (result.error) {
      setError(result.error.message ?? "Accepteren mislukt.");
      setSubmitting(false);
      return;
    }
    router.push("/account/licenses");
  }

  async function decline() {
    setSubmitting(true);
    setError(null);
    const result = await authClient.organization.rejectInvitation({
      invitationId,
    });
    if (result.error) {
      setError(result.error.message ?? "Weigeren mislukt.");
      setSubmitting(false);
      return;
    }
    router.push("/");
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
