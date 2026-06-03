"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Koppelt een apparaat los via het bestaande self-service endpoint. Eén bron
// voor de actie: dezelfde route als /account/licenses gebruikt.
export function KbDisconnectButton({ activationId }: { activationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function deactivate() {
    if (
      !window.confirm(
        "Dit apparaat loskoppelen? Het maakt een slot vrij; je kunt het later opnieuw activeren met je code.",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/account/activations/${activationId}/deactivate`,
        { method: "POST" },
      );
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        const d = await res.json().catch(() => ({}));
        window.alert(d.error ?? "Loskoppelen mislukt. Probeer opnieuw.");
        setBusy(false);
      }
    } catch {
      window.alert("Loskoppelen mislukt. Probeer opnieuw.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deactivate}
      disabled={busy}
      className="shrink-0 rounded-md border border-[color:var(--border-soft)] bg-white px-2.5 py-1 text-[0.75rem] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--red)] disabled:opacity-50"
    >
      {busy ? "Bezig…" : "Loskoppelen"}
    </button>
  );
}
