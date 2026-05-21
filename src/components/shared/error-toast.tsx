"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, { title: string; description?: string }> = {
  admin_only: {
    title: "Geen admin-rechten",
    description:
      "Je hebt geen toegang tot het admin-dashboard. Vraag een eigenaar om je rechten toe te kennen.",
  },
  signed_out: { title: "Je bent uitgelogd." },
  session_expired: {
    title: "Sessie verlopen",
    description: "Log opnieuw in om door te gaan.",
  },
};

export function ErrorToast() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (!error) return;
    const msg = MESSAGES[error];
    if (!msg) return;
    toast.error(msg.title, { description: msg.description });

    // strip the query param so refresh doesn't re-fire the toast
    const next = new URLSearchParams(params);
    next.delete("error");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname);
  }, [error, params, router]);

  return null;
}
