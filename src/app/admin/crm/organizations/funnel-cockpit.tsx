"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Check, Phone, Eye, Send, Rocket, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FUNNEL_TRACK,
  funnelNowZone,
  funnelTrackIndex,
  buildFunnelChecklist,
  type FunnelColumn,
  type FunnelAction,
  type FunnelStateInput,
} from "@/lib/services/partnerFunnelShared";
import { cn } from "@/lib/utils";

type FunnelStats = {
  referralCount: number;
  convertedCount: number;
  commissionCents: number;
};

type FunnelState = FunnelStateInput & {
  contactId: string;
  column: FunnelColumn;
  deckToken: string | null;
  companyName: string | null;
  stats: FunnelStats | null;
};

// Alleen deze sub-statussen zijn handmatige checkboxes; de rest is afgeleid.
const TOGGLEABLE = new Set(["commission", "discount", "expected_clients"]);

function fmt(s: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;
}

/** Partner-funnel-cockpit (A2): alle 7 stages verticaal van boven naar beneden,
 *  current oplicht, klaar = ✓ + datum, toekomst vergrendeld. Realtime + confirms.
 *  Werkt op een persoon (contactId) of de primary contact van een org (orgId). */
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
  const [confirm, setConfirm] = useState<{
    action: FunnelAction;
    text: string;
  } | null>(null);
  // Stap 6: "Publiceer" vraagt eerst "Heb je de pagina gecontroleerd?" (geen lock).
  const [publishAsk, setPublishAsk] = useState(false);

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

  // Realtime: eerste load + 15s-poll + on-focus (zelfde cadans als de CRM-grid).
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  async function runAction(action: FunnelAction) {
    if (!state || !action) return;
    if (action === "view_affiliate") {
      window.open("/admin/affiliates", "_blank");
      return;
    }
    setBusy(true);
    try {
      const cid = state.contactId;
      let res: Response;
      if (action === "send_deck" || action === "resend_deck") {
        res = await fetch(`/api/admin/crm/people/${cid}/send-deck`, { method: "POST" });
      } else if (action === "approve_brand") {
        res = await fetch(`/api/admin/crm/people/${cid}/approve-brand`, { method: "POST" });
      } else {
        // publish
        res = await fetch(`/api/admin/crm/people/${cid}/promote-reseller`, { method: "POST" });
      }
      const d = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !d.success) toast.error(d.error ?? "Actie mislukt");
      else {
        toast.success(
          action === "publish"
            ? "Partner live — code + welkomstmail verstuurd"
            : action === "approve_brand"
              ? "Brand identity goedgekeurd"
              : "Partnerdeck verstuurd",
        );
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  function triggerAction(action: FunnelAction, needsConfirm: boolean, text: string) {
    if (needsConfirm) setConfirm({ action, text });
    else void runAction(action);
  }

  async function toggleMarker(key: string, value: boolean) {
    if (!state) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/crm/people/${state.contactId}/afspraak-marker`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ marker: key, value }),
        },
      );
      const d = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !d.success) toast.error(d.error ?? "Opslaan mislukt");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function resendWelcome() {
    if (!state) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/crm/people/${state.contactId}/resend-welcome`,
        { method: "POST" },
      );
      const d = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !d.success) toast.error(d.error ?? "Versturen mislukt");
      else toast.success("Welkomstmail opnieuw verstuurd");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="p-4 text-sm text-muted-foreground">Laden…</p>;
  if (!state)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Geen funnel-data. Koppel een contactpersoon aan deze organisatie.
      </p>
    );

  const currentIdx = funnelTrackIndex(state.column);
  const isNietNu = state.column === "niet_nu";
  const checklist = buildFunnelChecklist(state);
  const markersUnlocked = !!state.appliedAt && !state.promotedAffiliateId;

  const actionIcon: Record<string, typeof Phone> = {
    send_deck: Send,
    resend_deck: Send,
    approve_brand: Eye,
    publish: Rocket,
    view_affiliate: ExternalLink,
  };

  return (
    <div className="space-y-2 p-1">
      {isNietNu && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          Niet nu — geparkeerd. Pak later opnieuw op of laat los.
        </div>
      )}

      {FUNNEL_TRACK.map((stage, i) => {
        const group = checklist.find((g) => g.stage === stage.key);
        const done = !isNietNu && i < currentIdx;
        const current = !isNietNu && i === currentIdx;
        const locked = isNietNu || i > currentIdx;
        const zone = funnelNowZone(stage.key);
        const Icon = zone.action ? actionIcon[zone.action] : null;

        return (
          <div
            key={stage.key}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              current
                ? "border-primary bg-primary/5"
                : done
                  ? "border-transparent bg-muted/40"
                  : "border-transparent bg-muted/20 opacity-70",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold",
                  done
                    ? "bg-primary text-primary-foreground"
                    : current
                      ? "bg-primary/20 text-primary ring-2 ring-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  current ? "text-primary" : done ? "" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
              {current && (
                <span className="ml-auto text-[0.625rem] font-bold uppercase tracking-wide text-primary">
                  nu
                </span>
              )}
              {locked && <Lock className="ml-auto size-3 text-muted-foreground" />}
            </div>

            {/* Sub-status-checklist */}
            {group && group.items.length > 0 && (
              <ul className="mt-2 space-y-1 pl-7">
                {group.items.map((it) => {
                  const toggleable = TOGGLEABLE.has(it.key) && markersUnlocked;
                  return (
                    <li key={it.key} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={it.done}
                        disabled={!toggleable || busy}
                        onChange={(e) => void toggleMarker(it.key, e.target.checked)}
                        className="size-3.5 shrink-0"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1",
                          it.done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {it.label}
                        {it.kind === "am" && !toggleable && (
                          <span className="ml-1 text-[0.5625rem] uppercase text-muted-foreground">
                            (AM)
                          </span>
                        )}
                      </span>
                      {it.at && (
                        <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                          {fmt(it.at)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Stats bij de actieve partner */}
            {stage.key === "actief" && state.stats && (
              <div className="mt-2 ml-7 flex flex-wrap gap-3 text-[0.6875rem] text-muted-foreground">
                <span>{state.stats.referralCount} aangebracht</span>
                <span>{state.stats.convertedCount} geconverteerd</span>
                <span>{eur(state.stats.commissionCents)} commissie</span>
              </div>
            )}

            {/* De actie(s) van deze stage. Stap 6 (brand_check) krijgt twee knoppen:
                eerst de landingspagina checken, dan publiceren via een ja/nee-modal. */}
            {stage.key === "brand_check" && current ? (
              <div className="mt-2 flex flex-wrap gap-2 pl-7">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    window.open(
                      `/admin/crm/people/${state.contactId}/landing-preview`,
                      "_blank",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <Eye className="size-3.5" strokeWidth={2.2} />
                  Controleer landingspagina
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPublishAsk(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Rocket className="size-3.5" strokeWidth={2.2} />
                  {busy ? "Bezig…" : "Publiceer landingpagina"}
                </button>
              </div>
            ) : stage.key === "actief" && current ? (
              <div className="mt-2 flex flex-wrap gap-2 pl-7">
                <button
                  type="button"
                  onClick={() => window.open("/admin/affiliates", "_blank")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <ExternalLink className="size-3.5" strokeWidth={2.2} />
                  Bekijk in affiliates
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resendWelcome()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Send className="size-3.5" strokeWidth={2.2} />
                  {busy ? "Versturen…" : "Welkomstmail opnieuw sturen"}
                </button>
              </div>
            ) : (
              zone.action && (
                <div className="mt-2 pl-7">
                  <button
                    type="button"
                    disabled={!current || busy}
                    onClick={() =>
                      triggerAction(zone.action, zone.confirm, zone.confirmText ?? "")
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                      current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {Icon &&
                      (current ? (
                        <Icon className="size-3.5" strokeWidth={2.2} />
                      ) : (
                        <Lock className="size-3" />
                      ))}
                    {busy && current ? "Bezig…" : zone.actionLabel}
                  </button>
                </div>
              )
            )}

            {/* Hint voor stages zonder knop (bel na / bel voor afspraak) */}
            {current && !zone.action && (
              <p className="mt-1.5 pl-7 text-xs text-muted-foreground">{zone.hint}</p>
            )}
          </div>
        );
      })}

      {/* Deck-link kopiëren */}
      {state.deckToken && (
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(
              `${window.location.origin}/partner/${state.deckToken}`,
            );
            toast.success("Deck-link gekopieerd");
          }}
          className="ml-1 text-xs text-primary underline underline-offset-2"
        >
          Kopieer deck-link
        </button>
      )}

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const a = confirm?.action ?? null;
                setConfirm(null);
                void runAction(a);
              }}
            >
              Doorgaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stap 6: publiceer-bevestiging (geen lock, wel een check). */}
      <AlertDialog
        open={publishAsk}
        onOpenChange={(o) => !o && setPublishAsk(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Heb je de pagina gecontroleerd?</AlertDialogTitle>
            <AlertDialogDescription>
              Daarna gaat de partner live. Z&apos;n 15%-kortingscode en de
              welkomstmail volgen automatisch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                toast.message("Oké, check dan ff of alles er netjes uitziet!")
              }
            >
              Nee
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPublishAsk(false);
                void runAction("publish");
              }}
            >
              Ja, publiceer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
