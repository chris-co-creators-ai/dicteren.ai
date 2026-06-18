"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FUNNEL_TRACK,
  funnelNowZone,
  type FunnelColumn,
  type FunnelAction,
} from "@/lib/services/partnerFunnelShared";

type FunnelState = {
  contactId: string;
  column: FunnelColumn;
  deckToken: string | null;
  deckSentAt: string | null;
  deckVisitedAt: string | null;
  appliedAt: string | null;
  companyName: string | null;
  appliedQuote: string | null;
  promotedAffiliateId: string | null;
  temperature: string | null;
};

function fmt(s: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

/** Reseller-funnel-cockpit: progressie-tracker A-Z + de NU-zone. Werkt op een
 *  persoon (contactId, persoon-side-panel) of op de primary contact van een org
 *  (orgId, org-side-panel) en bedient de routes. Geef er precies één mee. */
export function FunnelCockpit({
  orgId,
  contactId,
}: {
  orgId?: string;
  contactId?: string;
}) {
  const [state, setState] = useState<FunnelState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId && !contactId) {
      setLoaded(true);
      return;
    }
    try {
      const url = contactId
        ? `/api/admin/crm/people/${contactId}/funnel`
        : `/api/admin/crm/organizations/${orgId}/funnel`;
      const res = await fetch(url);
      const d = (await res.json()) as { data?: FunnelState | null };
      setState(d.data ?? null);
    } catch {
      setState(null);
    } finally {
      setLoaded(true);
    }
  }, [orgId, contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: FunnelAction) {
    if (!state || !action) return;
    if (action === "view_affiliate") {
      window.open("/admin/affiliates", "_blank");
      return;
    }
    setBusy(true);
    try {
      if (action === "send_deck" || action === "resend_deck") {
        const res = await fetch(
          `/api/admin/crm/people/${state.contactId}/send-deck`,
          { method: "POST" },
        );
        const d = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !d.success) toast.error(d.error ?? "Versturen mislukt");
        else {
          toast.success("Partnerdeck verstuurd");
          await load();
        }
      } else if (action === "promote") {
        const res = await fetch(
          `/api/admin/crm/people/${state.contactId}/promote-reseller`,
          { method: "POST" },
        );
        const d = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !d.success) toast.error(d.error ?? "Promoten mislukt");
        else {
          toast.success("Reseller aangemaakt — rond de showcase af in Affiliates");
          await load();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!state?.deckToken) return;
    const url = `${window.location.origin}/partner/${state.deckToken}`;
    void navigator.clipboard.writeText(url);
    toast.success("Deck-link gekopieerd");
  }

  if (!loaded) {
    return <p className="p-4 text-sm text-muted-foreground">Laden…</p>;
  }
  if (!state) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Geen funnel-data. Koppel een contactpersoon aan deze organisatie.
      </p>
    );
  }

  const now = funnelNowZone(state.column);
  const trackIdx = FUNNEL_TRACK.findIndex((t) => t.key === state.column);
  const isNietNu = state.column === "niet_nu";

  return (
    <div className="space-y-5 p-1">
      {/* Progressie-tracker A-Z */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {FUNNEL_TRACK.map((t, i) => {
          const done = trackIdx >= 0 && i < trackIdx;
          const current = !isNietNu && t.key === state.column;
          return (
            <span key={t.key} className="flex items-center gap-1.5">
              <span
                className={
                  current
                    ? "rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                    : done
                      ? "rounded-full bg-primary/15 px-2.5 py-1 text-primary"
                      : "rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
                }
              >
                {done ? "✓ " : ""}
                {t.label}
              </span>
              {i < FUNNEL_TRACK.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </span>
          );
        })}
        {isNietNu && (
          <span className="rounded-full bg-destructive/15 px-2.5 py-1 font-semibold text-destructive">
            Niet nu
          </span>
        )}
      </div>

      {/* NU-zone */}
      <div className="rounded-xl border bg-card p-4">
        <h4 className="text-sm font-semibold">{now.headline}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{now.hint}</p>
        {now.action && (
          <button
            type="button"
            onClick={() => void act(now.action)}
            disabled={busy}
            className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Bezig…" : now.actionLabel}
          </button>
        )}
      </div>

      {/* Tracking-tijdlijn */}
      <ul className="space-y-1.5 text-sm">
        {state.deckSentAt && <li>Deck verstuurd op {fmt(state.deckSentAt)}</li>}
        {state.deckVisitedAt && (
          <li className="text-primary">Deck bekeken op {fmt(state.deckVisitedAt)}</li>
        )}
        {state.appliedAt && (
          <li className="font-medium">Aangemeld op {fmt(state.appliedAt)}</li>
        )}
        {state.deckToken && (
          <li>
            <button
              type="button"
              onClick={copyLink}
              className="text-primary underline underline-offset-2"
            >
              Kopieer deck-link
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
