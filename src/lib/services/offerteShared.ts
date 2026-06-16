// Dicteren.ai — Offerte: pure helpers (client + server)
//
// GEEN server-only import: zowel de offerte-creator-UI (live preview) als de
// server-service rekenen hiermee, zodat de getallen op het scherm exact gelijk
// zijn aan wat in de DB-snapshot en de PDF belandt. De prijslogica zelf komt uit
// pricingTiers.ts (één waarheid); dit bestand kleedt 'm aan tot offerte-regels.

import {
  perSeatCentsForPeriod,
  periodLabelNl,
  withVatCents,
  type PricingSnapshot,
  type BillingPeriod,
} from "./pricingTiers";

export type OffertePeriod = "monthly" | "quarterly" | "yearly";
export type OfferteStatus =
  | "concept"
  | "verzonden"
  | "geaccepteerd"
  | "afgewezen"
  | "verlopen";
// Eén sjabloon: Merk. Strak/Klassiek zijn verwijderd (besluit Christian 2026-06-16).
export type OfferteTemplateKey = "merk";

/** Eén netto regel op de offerte (excl. btw). netCents = qty × unitNetCents. */
export type OfferteLineItem = {
  description: string;
  qty: number;
  unitNetCents: number;
  netCents: number;
};

export const OFFERTE_STATUSES: OfferteStatus[] = [
  "concept",
  "verzonden",
  "geaccepteerd",
  "afgewezen",
  "verlopen",
];

export const OFFERTE_STATUS_LABEL: Record<OfferteStatus, string> = {
  concept: "Concept",
  verzonden: "Verzonden",
  geaccepteerd: "Geaccepteerd",
  afgewezen: "Afgewezen",
  verlopen: "Verlopen",
};

export const OFFERTE_VALIDITY_DAYS = 30;

// Concept-copy — user-facing, valt onder de TOV-gate en gaat pas live na
// Christians akkoord. Bewust kort en feitelijk.
export const DEFAULT_OFFERTE_INTRO =
  "Bedankt voor je interesse in Dicteren.ai. Hieronder staat je offerte op maat.";
export const DEFAULT_OFFERTE_CLOSING =
  "Vragen over deze offerte? Mail naar info@dicteren.ai.";

/** ISO-datum (YYYY-MM-DD) van vandaag + geldigheidsdagen. */
export function defaultValidUntil(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + OFFERTE_VALIDITY_DAYS);
  return d.toISOString().slice(0, 10);
}

/** Standaard offerte-regel uit de calculator: seats × periode-staffelprijs.
 *  Voor 50+ (maatwerk-tier) is de staffelprijs 0 — de AM vult dan zelf de
 *  prijs in op de regel. */
export function buildStandardLineItems(
  pricing: PricingSnapshot,
  seats: number,
  period: OffertePeriod,
): OfferteLineItem[] {
  const s = Math.max(1, Math.floor(seats));
  const perSeat = perSeatCentsForPeriod(pricing, s, period as BillingPeriod);
  const desc = `Dicteren.ai zakelijk: ${s} ${
    s === 1 ? "gebruiker" : "gebruikers"
  }, per ${periodLabelNl(period as BillingPeriod)}`;
  return [
    { description: desc, qty: s, unitNetCents: perSeat, netCents: perSeat * s },
  ];
}

/** Herbereken netCents per regel (qty × unit) en gooi lege regels weg. */
export function normalizeLineItems(items: OfferteLineItem[]): OfferteLineItem[] {
  return (items ?? [])
    .filter((it) => it && String(it.description ?? "").trim())
    .map((it) => {
      const qty = Math.max(0, Number(it.qty) || 0);
      const unit = Math.round(Number(it.unitNetCents) || 0);
      return {
        description: String(it.description).trim(),
        qty,
        unitNetCents: unit,
        netCents: qty * unit,
      };
    });
}

/** Subtotaal (excl. btw) → 21% btw → totaal (incl. btw), via withVatCents zodat
 *  de afronding exact gelijk is aan checkout en de factuur. */
export function computeOfferteTotals(items: OfferteLineItem[]): {
  netCents: number;
  vatCents: number;
  grossCents: number;
} {
  const netCents = items.reduce((sum, it) => sum + Math.round(it.netCents), 0);
  const grossCents = withVatCents(netCents);
  return { netCents, vatCents: grossCents - netCents, grossCents };
}

/** Euro-formatter (nl-NL). Toont centen alleen als ze niet 0 zijn. */
export function euroCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Platte, geserialiseerde data voor de PDF-render (route → document). */
export type OfferteDocData = {
  quoteNumber: string;
  status: OfferteStatus | string;
  createdAt: string; // ISO
  validUntil: string | null; // YYYY-MM-DD
  period: OffertePeriod | string;
  introText: string;
  closingText: string;
  notes: string | null;
  lineItems: OfferteLineItem[];
  netCents: number;
  vatCents: number;
  grossCents: number;
  seller: {
    name: string;
    email: string;
    website: string;
    kvk: string | null;
    vat: string | null;
    address: string | null;
  };
  buyer: {
    name: string;
    kvk: string | null;
    vatNumber: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    contactName: string | null;
    contactEmail: string | null;
  };
};
