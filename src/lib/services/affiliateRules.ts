// Dicteren.ai — Affiliate commission rule lookup + lockup-mechaniek
//
// Per-customer-type (consumer/business) en per-payment-kind (first/renewal)
// kiest deze service de juiste commission-parameters uit de affiliate-rij.
//
// Lockup = vaste 30 dagen. Pending → payable na deze tijd, tenzij refund of
// cancel-in-lockup hem void heeft gemaakt.

import "server-only";
import type { Affiliate } from "@/lib/db/schema";

type AffiliateCommissionType = "percentage" | "fixed_per_seat";

/** Global lockup-period vanaf order.paidAt vóór commissie payable wordt. */
export const LOCKUP_DAYS = 30;

/** Maand-grens voor de uitbetaling-cron. */
export const PAYOUT_DAY_OF_MONTH = 25;

export type CustomerTypeKey = "consumer" | "business";

export type CommissionRule = {
  enabled: boolean;
  type: AffiliateCommissionType;
  commissionPct: number;
  commissionFixedCents: number;
  durationMonths: number;
  isRenewal: boolean;
};

/** Bepaal welke commissie-regel van toepassing is voor een paid order.
 *
 *  Returnt null als:
 *    - affiliate heeft geen commissie ingesteld voor dit customer-type
 *    - bij renewal: duration is verstreken
 */
export function pickCommissionRule(args: {
  affiliate: Affiliate;
  customerType: CustomerTypeKey;
  isRenewal: boolean;
  /** Maanden sinds firstSeen van de referral. Voor renewal-cutoff. */
  monthsSinceFirstSeen?: number;
}): CommissionRule | null {
  const prefix = args.customerType;

  // Pak basis-velden
  const baseType =
    args.affiliate[`${prefix}CommissionType` as const] as AffiliateCommissionType | null;
  if (!baseType) {
    // Geen per-type-regel ingesteld → val terug op de legacy-commissievelden.
    // De admin-create-modal vult alleen die, dus zonder fallback verdient een
    // zo aangemaakte reseller €0. Legacy geldt als lifetime (first + renewal).
    return legacyRule(args.affiliate, args.isRenewal);
  }
  const durationMonths =
    (args.affiliate[
      `${prefix}CommissionDurationMonths` as const
    ] as number | undefined) ?? 0;

  // Voor renewals: check duration-cutoff (0 = lifetime)
  if (args.isRenewal && durationMonths > 0 && args.monthsSinceFirstSeen !== undefined) {
    if (args.monthsSinceFirstSeen >= durationMonths) {
      return null;
    }
  }

  // First-payment vs renewal velden
  if (args.isRenewal) {
    const recPct =
      (args.affiliate[
        `${prefix}RecurringCommissionPct` as const
      ] as number | undefined) ?? 0;
    const recFixed =
      (args.affiliate[
        `${prefix}RecurringCommissionFixedCents` as const
      ] as number | undefined) ?? 0;
    if (recPct === 0 && recFixed === 0) {
      // Geen renewal-commissie ingesteld → skip
      return null;
    }
    return {
      enabled: true,
      type: baseType,
      commissionPct: recPct,
      commissionFixedCents: recFixed,
      durationMonths,
      isRenewal: true,
    };
  }

  // First-payment
  const pct =
    (args.affiliate[
      `${prefix}CommissionPct` as const
    ] as number | undefined) ?? 0;
  const fixed =
    (args.affiliate[
      `${prefix}CommissionFixedCents` as const
    ] as number | undefined) ?? 0;
  if (pct === 0 && fixed === 0) {
    return null;
  }
  return {
    enabled: true,
    type: baseType,
    commissionPct: pct,
    commissionFixedCents: fixed,
    durationMonths,
    isRenewal: false,
  };
}

/** Legacy-fallback: gebruik de affiliate-brede commissievelden wanneer er
 *  geen per-customer-type regel is ingesteld. */
function legacyRule(
  affiliate: Affiliate,
  isRenewal: boolean,
): CommissionRule | null {
  const type =
    (affiliate.commissionType as AffiliateCommissionType | null) ?? null;
  if (!type) return null;
  const pct = affiliate.commissionPct ?? 0;
  const fixed = affiliate.commissionFixedCents ?? 0;
  if (pct === 0 && fixed === 0) return null;
  return {
    enabled: true,
    type,
    commissionPct: pct,
    commissionFixedCents: fixed,
    durationMonths: 0,
    isRenewal,
  };
}

/** Bereken commission-amount voor een rule + basis. */
export function calculateRuleCommissionCents(args: {
  rule: CommissionRule;
  basisAmountCents: number;
  seats: number;
}): number {
  if (args.rule.type === "percentage") {
    return Math.round((args.basisAmountCents * args.rule.commissionPct) / 100);
  }
  return args.rule.commissionFixedCents * Math.max(1, args.seats);
}

/** Bereken unlocks_at = paidAt + LOCKUP_DAYS. */
export function calculateUnlocksAt(paidAt: Date): Date {
  return new Date(paidAt.getTime() + LOCKUP_DAYS * 24 * 60 * 60 * 1000);
}

/** Bereken hoeveel maanden er zijn verstreken sinds firstSeen-date. */
export function monthsSince(firstSeenAt: Date, now: Date = new Date()): number {
  const years = now.getFullYear() - firstSeenAt.getFullYear();
  const months = now.getMonth() - firstSeenAt.getMonth();
  const totalMonths = years * 12 + months;
  // Correct voor day-of-month: als now's day < firstSeen's day, dan is de
  // volle maand nog niet bereikt.
  if (now.getDate() < firstSeenAt.getDate()) {
    return Math.max(0, totalMonths - 1);
  }
  return Math.max(0, totalMonths);
}

/** Customer-type-key derive uit `plan.customerType` (db-enum). */
export function customerTypeFromPlanType(
  planCustomerType: "consumer" | "organization",
): CustomerTypeKey {
  return planCustomerType === "organization" ? "business" : "consumer";
}
