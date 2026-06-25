// Dicteren.ai — Partner-funnel A2: afgeleide stage + sub-status-checklist + NU-zone.
//
// De stage is GEEN aparte DB-kolom maar een afgeleide van de contact-state-velden
// + de org-stage. Eén bron van waarheid, geen drift. De cockpit (Partner-tab)
// rendert deze pure laag: 7 stages verticaal, current oplicht, klaar = ✓ + datum,
// toekomst vergrendeld. Zie .claude/prds/partner-onboarding/flow-A.md §7.

export type FunnelColumn =
  | "nieuw"
  | "deck_verstuurd"
  | "deck_bekeken"
  | "geinteresseerd"
  | "afspraak_rond"
  | "brand_check"
  | "actief"
  | "niet_nu";

/** Alle velden die de stage + de sub-statussen bepalen. Datums als ISO-string
 *  (of null). De afgeleide laag raakt de DB niet aan. */
export type FunnelStateInput = {
  // Stage-markers (volgorde = de funnel)
  deckSentAt: string | null;
  deckVisitedAt: string | null;
  appliedAt: string | null;
  commissionDiscussedAt: string | null;
  discountAgreedAt: string | null;
  expectedClientsLoggedAt: string | null;
  brandIdentityApprovedAt: string | null;
  promotedAffiliateId: string | null;
  // Context
  orgStatus: string | null;
  doNotCall: boolean;
  temperature: "cold" | "lukewarm" | "warm" | "hot" | null;
  // Sub-status-bron
  lastContactAt: string | null;
  appliedLogoR2Key: string | null;
  appliedBrandColor: string | null;
  appliedQuote: string | null;
  appliedPortraitR2Key: string | null;
  appliedIntroText: string | null;
};

/** De hoofdroute van A tot Z (zonder het Niet-nu-zijspoor), voor de tracker. */
export const FUNNEL_TRACK: { key: FunnelColumn; label: string }[] = [
  { key: "nieuw", label: "Nieuw" },
  { key: "deck_verstuurd", label: "Deck verstuurd" },
  { key: "deck_bekeken", label: "Deck bekeken" },
  { key: "geinteresseerd", label: "Geïnteresseerde partner" },
  { key: "afspraak_rond", label: "Afspraak rond" },
  { key: "brand_check", label: "Brand identity controleren" },
  { key: "actief", label: "Actieve partner" },
];

export const FUNNEL_LABEL: Record<FunnelColumn, string> = {
  nieuw: "Nieuw",
  deck_verstuurd: "Deck verstuurd",
  deck_bekeken: "Deck bekeken",
  geinteresseerd: "Geïnteresseerde partner",
  afspraak_rond: "Afspraak rond",
  brand_check: "Brand identity controleren",
  actief: "Actieve partner",
  niet_nu: "Niet nu",
};

/** Index van een stage in de hoofdroute (-1 voor niet_nu). */
export function funnelTrackIndex(col: FunnelColumn): number {
  return FUNNEL_TRACK.findIndex((t) => t.key === col);
}

/** Zijn alle drie de afspraak-vinkjes gezet? */
function afspraakRond(s: FunnelStateInput): boolean {
  return (
    !!s.commissionDiscussedAt &&
    !!s.discountAgreedAt &&
    !!s.expectedClientsLoggedAt
  );
}

/** Bepaal de huidige stage = de hoogste bereikte mijlpaal. Prioriteit hoog→laag.
 *  BELANGRIJK: "Deck bekeken" verspringt op een ECHT bezoek (deckVisitedAt), niet
 *  op temperature. Telefonische interesse is een sub-status binnen "Deck verstuurd",
 *  geen kolom-sprong (A2, vraag A). */
export function deriveFunnelColumn(s: FunnelStateInput): FunnelColumn {
  if (s.promotedAffiliateId || s.orgStatus === "reseller") return "actief";
  if (s.orgStatus === "lost" || s.orgStatus === "churned" || s.doNotCall)
    return "niet_nu";
  if (s.brandIdentityApprovedAt) return "brand_check";
  if (afspraakRond(s)) return "afspraak_rond";
  if (s.appliedAt) return "geinteresseerd";
  if (s.deckVisitedAt) return "deck_bekeken";
  if (s.deckSentAt) return "deck_verstuurd";
  return "nieuw";
}

export type FunnelAction =
  | "send_deck"
  | "resend_deck"
  | "approve_brand"
  | "publish"
  | "view_affiliate"
  | null;

export type NowZone = {
  headline: string;
  hint: string;
  action: FunnelAction;
  actionLabel: string | null;
  /** Externe/onomkeerbare actie: vraag een "are you sure?" (A2-12). */
  confirm: boolean;
  confirmText: string | null;
};

/** De NU-zone per stage: de ene actie die telt + of 'ie bevestiging vraagt. */
export function funnelNowZone(col: FunnelColumn): NowZone {
  switch (col) {
    case "nieuw":
      return {
        headline: "Bel en stuur het deck",
        hint: "Na een positief gesprek: stuur het partnerdeck vanuit je eigen adres.",
        action: "send_deck",
        actionLabel: "Partnerdeck sturen",
        confirm: true,
        confirmText:
          "Dit stuurt het partnerdeck per mail vanuit jouw adres. Versturen?",
      };
    case "deck_verstuurd":
      return {
        headline: "Deck verstuurd, wacht op bezoek",
        hint: "Telefonisch geïnteresseerd maar nog niet bekeken? Bel na of stuur de link opnieuw.",
        action: "resend_deck",
        actionLabel: "Opnieuw sturen",
        confirm: true,
        confirmText:
          "Dit stuurt het partnerdeck nogmaals per mail vanuit jouw adres. Versturen?",
      };
    case "deck_bekeken":
      return {
        headline: "Bekeek het deck — bel na",
        hint: "Hier zit de deal. Bel de warme lead.",
        action: null,
        actionLabel: null,
        confirm: false,
        confirmText: null,
      };
    case "geinteresseerd":
      return {
        headline: "Aangemeld — bel voor de afspraak",
        hint: "Bel om commissie en de 15%-korting af te spreken, en vink het af.",
        action: null,
        actionLabel: null,
        confirm: false,
        confirmText: null,
      };
    case "afspraak_rond":
      return {
        headline: "Afspraak rond — controleer de brand identity",
        hint: "Bekijk het logo, de kleur en de naam en keur goed.",
        action: "approve_brand",
        actionLabel: "Bekijk + goedkeuren",
        confirm: false,
        confirmText: null,
      };
    case "brand_check":
      return {
        headline: "Klaar om te publiceren",
        hint: "Zet de partner live. De kortingscode en de welkomstmail volgen automatisch.",
        action: "publish",
        actionLabel: "Publiceer landingpagina",
        confirm: true,
        confirmText:
          "Dit zet de partner live, maakt z'n 15%-kortingscode aan en stuurt de welkomstmail. Doorgaan?",
      };
    case "actief":
      return {
        headline: "Actieve partner",
        hint: "Beheer commissie en de showcase-pagina in /admin/affiliates.",
        action: "view_affiliate",
        actionLabel: "Bekijk in affiliates",
        confirm: false,
        confirmText: null,
      };
    case "niet_nu":
      return {
        headline: "Niet nu",
        hint: "Geparkeerd. Pak later opnieuw op of laat los.",
        action: null,
        actionLabel: null,
        confirm: false,
        confirmText: null,
      };
  }
}

// ───── Sub-status-checklist (alle stages zichtbaar + getrackt, A2-3) ─────

export type ChecklistKind = "auto" | "am";

export type ChecklistItem = {
  key: string;
  label: string;
  kind: ChecklistKind;
  done: boolean;
  /** ISO-datum waarop het item afgevinkt werd, indien bekend. */
  at: string | null;
};

export type StageGroup = {
  stage: FunnelColumn;
  label: string;
  items: ChecklistItem[];
};

/** Bouw de volledige cumulatieve checklist over alle hoofdroute-stages. Auto-items
 *  leidt het systeem af uit de velden; AM-items zijn de handmatige vinkjes. De
 *  cockpit rendert dit één-op-één. Stage-7-items (gepubliceerd/code/mail) gebeuren
 *  atomair bij de promote, dus ze hangen alle drie aan promotedAffiliateId. */
export function buildFunnelChecklist(s: FunnelStateInput): StageGroup[] {
  const item = (
    key: string,
    label: string,
    kind: ChecklistKind,
    at: string | null,
    doneOverride?: boolean,
  ): ChecklistItem => ({
    key,
    label,
    kind,
    done: doneOverride ?? !!at,
    at,
  });

  const published = !!s.promotedAffiliateId;
  const brandIdentityFilled = !!(
    s.appliedLogoR2Key ||
    s.appliedBrandColor ||
    s.appliedQuote ||
    s.appliedPortraitR2Key ||
    s.appliedIntroText
  );
  const phoneInterested =
    !s.deckVisitedAt && (s.temperature === "warm" || s.temperature === "hot");

  return [
    {
      stage: "nieuw",
      label: "Nieuw",
      items: [item("called", "Gebeld", "auto", s.lastContactAt)],
    },
    {
      stage: "deck_verstuurd",
      label: "Deck verstuurd",
      items: [
        item("deck_sent", "Deck verstuurd", "auto", s.deckSentAt),
        item(
          "phone_interested",
          "Telefonisch geïnteresseerd",
          "auto",
          null,
          phoneInterested,
        ),
      ],
    },
    {
      stage: "deck_bekeken",
      label: "Deck bekeken",
      items: [item("deck_visited", "Deck bekeken", "auto", s.deckVisitedAt)],
    },
    {
      stage: "geinteresseerd",
      label: "Geïnteresseerde partner",
      items: [
        item("applied", "Aangemeld", "auto", s.appliedAt),
        item(
          "brand_filled",
          "Brand identity ingevuld",
          "auto",
          s.appliedAt,
          brandIdentityFilled,
        ),
      ],
    },
    {
      stage: "afspraak_rond",
      label: "Afspraak rond",
      items: [
        item("commission", "Commissie besproken", "am", s.commissionDiscussedAt),
        item("discount", "15%-korting afgesproken", "am", s.discountAgreedAt),
        item(
          "expected_clients",
          "Verwachte klanten vastgelegd",
          "am",
          s.expectedClientsLoggedAt,
        ),
      ],
    },
    {
      stage: "brand_check",
      label: "Brand identity controleren",
      items: [
        item(
          "brand_approved",
          "Brand identity goedgekeurd",
          "am",
          s.brandIdentityApprovedAt,
        ),
      ],
    },
    {
      stage: "actief",
      label: "Actieve partner",
      items: [
        item("published", "Landingpagina gepubliceerd", "auto", null, published),
        item("code_created", "15%-kortingscode aangemaakt", "auto", null, published),
        item("welcome_sent", "Welkomstmail verstuurd", "auto", null, published),
      ],
    },
  ];
}
