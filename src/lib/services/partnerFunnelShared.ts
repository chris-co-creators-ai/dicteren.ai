// Dicteren.ai — Reseller-funnel: afgeleide kolom + NU-zone (pure, client+server).
//
// De funnel-kolom is GEEN aparte DB-kolom maar een afgeleide van de
// contact-state-velden + de org-stage. Eén bron van waarheid, geen drift.
// Zie .claude/prds/partner-onboarding/flow.md.

export type FunnelColumn =
  | "nieuw"
  | "deck_verstuurd"
  | "warm"
  | "aangemeld"
  | "reseller"
  | "niet_nu";

export type FunnelStateInput = {
  deckSentAt: string | null;
  deckVisitedAt: string | null;
  appliedAt: string | null;
  promotedAffiliateId: string | null;
  temperature: "cold" | "lukewarm" | "warm" | "hot" | null;
  orgStatus: string | null;
  doNotCall: boolean;
};

/** De hoofdroute van A tot Z (zonder het Niet-nu-zijspoor), voor de tracker. */
export const FUNNEL_TRACK: { key: FunnelColumn; label: string }[] = [
  { key: "nieuw", label: "Nieuw" },
  { key: "deck_verstuurd", label: "Deck verstuurd" },
  { key: "warm", label: "Warm" },
  { key: "aangemeld", label: "Aangemeld" },
  { key: "reseller", label: "Reseller" },
];

export const FUNNEL_LABEL: Record<FunnelColumn, string> = {
  nieuw: "Nieuw",
  deck_verstuurd: "Deck verstuurd",
  warm: "Warm",
  aangemeld: "Aangemeld",
  reseller: "Reseller",
  niet_nu: "Niet nu",
};

/** Bepaal de kolom. Prioriteit: reseller > niet-nu > aangemeld > warm >
 *  deck verstuurd > nieuw. Niet-nu vóór aangemeld zodat een na-aanmelding
 *  afgewezen lead op het zijspoor komt. */
export function deriveFunnelColumn(s: FunnelStateInput): FunnelColumn {
  if (s.promotedAffiliateId || s.orgStatus === "reseller") return "reseller";
  if (s.orgStatus === "lost" || s.orgStatus === "churned" || s.doNotCall)
    return "niet_nu";
  if (s.appliedAt) return "aangemeld";
  if (s.temperature === "warm" || s.temperature === "hot") return "warm";
  if (s.deckSentAt) return "deck_verstuurd";
  return "nieuw";
}

export type FunnelAction = "send_deck" | "resend_deck" | "promote" | "view_affiliate" | null;

/** De NU-zone per kolom: wat de AM ziet en de ene actie die telt. */
export function funnelNowZone(col: FunnelColumn): {
  headline: string;
  hint: string;
  action: FunnelAction;
  actionLabel: string | null;
} {
  switch (col) {
    case "nieuw":
      return {
        headline: "Bel en stuur het deck",
        hint: "Na een positief gesprek: stuur het partnerdeck vanuit je eigen adres.",
        action: "send_deck",
        actionLabel: "Partnerdeck sturen",
      };
    case "deck_verstuurd":
      return {
        headline: "Deck verstuurd, wacht op bezoek",
        hint: "Zodra de prospect het deck bekijkt, springt 'ie naar Warm.",
        action: "resend_deck",
        actionLabel: "Opnieuw sturen",
      };
    case "warm":
      return {
        headline: "Bekeek het deck — bel na",
        hint: "Hier zit de deal. Bel de warme lead.",
        action: null,
        actionLabel: null,
      };
    case "aangemeld":
      return {
        headline: "Beoordeel en activeer",
        hint: "De prospect meldde zich aan. Bel voor de afspraken en maak 'm reseller.",
        action: "promote",
        actionLabel: "Maak reseller",
      };
    case "reseller":
      return {
        headline: "Actieve reseller",
        hint: "Beheer commissie en de showcase-pagina in /admin/affiliates.",
        action: "view_affiliate",
        actionLabel: "Bekijk in affiliates",
      };
    case "niet_nu":
      return {
        headline: "Niet nu",
        hint: "Geparkeerd. Pak later opnieuw op of laat los.",
        action: null,
        actionLabel: null,
      };
  }
}
