"use client";

import { useEffect } from "react";

/** Logt het bezoek aan de deck-pagina via een route-handler. Het bezoek is de
 *  warm-trigger (niet de mail-open). Client-side omdat een page-render geen
 *  DB-mutatie hoort te doen; idempotent server-side. */
export function DeckVisitTracker({ token }: { token: string }) {
  useEffect(() => {
    fetch(`/api/partner/${encodeURIComponent(token)}/visit`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, [token]);
  return null;
}
