// Dicteren.ai — Mollie metadata builder
//
// Mollie ondersteunt geen native tags/labels in het dashboard, maar wel een
// `metadata` veld (~1kB JSON) op Payments, Customers en Subscriptions. Deze
// builder zorgt dat ELKE Mollie-resource we aanmaken hetzelfde schema krijgt
// zodat we via de Mollie API kunnen filteren op segment, source, discount.
//
// Wat we WEL doen:
//   • alle paying customers (consumer / team) krijgen een Mollie customer
//   • metadata bevat altijd: userId, segment, source, licenseType, period
//   • discount-info wordt mee-geseriealiseerd
//
// Wat we NIET doen:
//   • partners (stichtingen) komen NIET in Mollie — geen transactie, geen reden
//   • lifetime gratis CONSUMER krijgt wel een Mollie customer (toekomstige upsell)
//     maar geen subscription
//
// Mollie heeft een limiet van ~1kB op metadata; deze keys passen ruim binnen.

import type { LicensePeriod, LicenseType } from "@/lib/types";

export type CustomerSegment = "consumer" | "team" | "partner";

export type LicenseSource =
  | "self-signup"
  | "admin-grant"
  | `partner:${string}`
  | `affiliate:${string}`;

export type DiscountSnapshot =
  | { type: "free_months"; value: number }
  | { type: "percentage"; value: number }
  | { type: "fixed"; value: number }
  | { type: "lifetime"; value: 0 }
  | null;

export interface MollieMetadataInput {
  userId: string;
  segment: CustomerSegment;
  source: LicenseSource;
  licenseType: LicenseType;
  period: LicensePeriod;
  /** Onze interne referentie (orderId / licenseId) — om kruisreferentie te leggen */
  internalRef: string;
  discount?: DiscountSnapshot;
  organizationId?: string | null;
  email?: string;
  name?: string;
}

/**
 * Bouwt een Mollie-metadata-object volgens ons standaardschema.
 * Discount wordt gespiegeld in twee scalar-keys zodat Mollie API-filters er
 * eenvoudig op kunnen matchen (Mollie metadata-filter doet exacte match per key).
 */
export function buildMollieMetadata(
  input: MollieMetadataInput,
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {
    userId: input.userId,
    segment: input.segment,
    source: input.source,
    licenseType: input.licenseType,
    period: input.period,
    internalRef: input.internalRef,
  };
  if (input.organizationId) out.organizationId = input.organizationId;
  if (input.email) out.email = input.email;
  if (input.name) out.name = input.name;
  if (input.discount) {
    out.discountType = input.discount.type;
    out.discountValue = input.discount.value;
  }
  return out;
}

/**
 * Bepaal segment uit licenseType. Beta + consumer = "consumer" segment.
 * Team blijft team. Partner = partner (al filteren we ze uit Mollie).
 */
export function segmentForLicenseType(type: LicenseType): CustomerSegment {
  switch (type) {
    case "team":
      return "team";
    case "partner":
      return "partner";
    case "beta":
    case "consumer":
    default:
      return "consumer";
  }
}

/**
 * Bereken de Mollie subscription `startDate` voor X gratis maanden.
 * Mollie format = ISO yyyy-MM-dd. Default = vandaag (= directe charge).
 */
export function startDateForFreeMonths(freeMonths: number, from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + Math.max(0, freeMonths));
  return d.toISOString().slice(0, 10);
}
