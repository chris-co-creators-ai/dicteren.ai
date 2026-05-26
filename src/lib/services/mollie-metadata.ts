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
  /** B2B audit-trail bij Mollie. Mollie heeft geen native company/VAT-velden;
   *  we sturen ze als metadata zodat het in Mollie-dashboard te zien is. */
  organizationName?: string | null;
  vatNumber?: string | null;
  countryCode?: string | null;
}

// Per-veld lengte-caps zodat ons standaard-schema ruim binnen Mollie's
// ~1kB limit blijft, ook bij lange organisatienamen of e-mailadressen.
const FIELD_CAPS = {
  source: 80,
  email: 200,
  name: 120,
  organizationName: 120,
  vatNumber: 32,
  countryCode: 4,
} as const;

const SOFT_SIZE_LIMIT_BYTES = 1000;

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

/**
 * Bouwt een Mollie-metadata-object volgens ons standaardschema.
 * Discount wordt gespiegeld in twee scalar-keys zodat Mollie API-filters er
 * eenvoudig op kunnen matchen (Mollie metadata-filter doet exacte match per key).
 *
 * String-velden worden per-veld getrimd (zie FIELD_CAPS). Bij naderen van de
 * Mollie ~1kB metadata-limit komt er een warn-log; de payload wordt nooit
 * stil afgekapt — beter een Mollie 422 dan ontbrekende audit-data.
 */
export function buildMollieMetadata(
  input: MollieMetadataInput,
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {
    userId: input.userId,
    segment: input.segment,
    source: truncate(input.source, FIELD_CAPS.source),
    licenseType: input.licenseType,
    period: input.period,
    internalRef: input.internalRef,
  };
  if (input.organizationId) out.organizationId = input.organizationId;
  if (input.email) out.email = truncate(input.email, FIELD_CAPS.email);
  if (input.name) out.name = truncate(input.name, FIELD_CAPS.name);
  if (input.organizationName) {
    out.organizationName = truncate(
      input.organizationName,
      FIELD_CAPS.organizationName,
    );
  }
  if (input.vatNumber) out.vatNumber = truncate(input.vatNumber, FIELD_CAPS.vatNumber);
  if (input.countryCode) {
    out.countryCode = truncate(input.countryCode, FIELD_CAPS.countryCode);
  }
  if (input.discount) {
    out.discountType = input.discount.type;
    out.discountValue = input.discount.value;
  }

  const serialized = JSON.stringify(out);
  if (serialized.length > SOFT_SIZE_LIMIT_BYTES) {
    console.warn(
      `[mollie-metadata] payload nadert 1kB limit (${serialized.length} bytes) — overweeg veld-trimming.`,
      { userId: input.userId, internalRef: input.internalRef },
    );
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
