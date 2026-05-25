// Dicteren.ai — Discount-code service
//
// Discount-codes hebben twee functies:
//   1. Korting voor de klant
//   2. Optioneel: attributie aan een affiliate-reseller via discount_codes.affiliateId
//
// Bij checkout: validateDiscountCode → korting toepassen → opslaan in
// orders.discountCodeId. Bij paid-webhook: increment redemption + attribueer
// user aan de affiliate als die gekoppeld is.

import "server-only";
import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  discountCodes,
  orders,
  type DiscountCode,
} from "@/lib/db/schema";

type NewDiscountCode = typeof discountCodes.$inferInsert;

export type DiscountValidationOk = {
  success: true;
  discount: DiscountCode;
  /** Bedrag dat afgetrokken wordt (cents). 0 voor free_months — die geldt
   *  als startDate-shift, niet als direct korting op de payment. */
  discountAmountCents: number;
  /** Bedrag dat klant uiteindelijk betaalt (cents). */
  payableAmountCents: number;
};

export type DiscountValidationFail = {
  success: false;
  error: string;
  code:
    | "NOT_FOUND"
    | "INACTIVE"
    | "EXPIRED"
    | "NOT_STARTED"
    | "MAX_REDEEMED"
    | "MIN_SEATS"
    | "WRONG_PLAN"
    | "WRONG_AUDIENCE";
};

export type DiscountValidation = DiscountValidationOk | DiscountValidationFail;

/** Normaliseer user-input (uppercase, strip spaties). */
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Valideer een discount-code voor een specifieke checkout-context.
 *  Berekent ook het effectieve kortingsbedrag voor de huidige order. */
export async function validateDiscountCode(args: {
  code: string;
  basisAmountCents: number;
  planId?: string | null;
  seats?: number;
  audience?: "consumer" | "organization" | null;
}): Promise<DiscountValidation> {
  const normalized = normalizeCode(args.code);
  const [row] = await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.code, normalized))
    .limit(1);

  if (!row) {
    return {
      success: false,
      error: "Code niet gevonden.",
      code: "NOT_FOUND",
    };
  }
  if (!row.isActive) {
    return {
      success: false,
      error: "Deze code is niet meer actief.",
      code: "INACTIVE",
    };
  }
  const now = new Date();
  if (row.validFrom && row.validFrom > now) {
    return {
      success: false,
      error: "Deze code is nog niet geldig.",
      code: "NOT_STARTED",
    };
  }
  if (row.validUntil && row.validUntil < now) {
    return {
      success: false,
      error: "Deze code is verlopen.",
      code: "EXPIRED",
    };
  }
  if (row.maxRedemptions && row.redemptionCount >= row.maxRedemptions) {
    return {
      success: false,
      error: "Deze code is volledig gebruikt.",
      code: "MAX_REDEEMED",
    };
  }
  if (row.planId && args.planId && row.planId !== args.planId) {
    return {
      success: false,
      error: "Deze code geldt niet voor dit plan.",
      code: "WRONG_PLAN",
    };
  }
  if (
    row.appliesTo &&
    args.audience &&
    row.appliesTo !== args.audience
  ) {
    return {
      success: false,
      error:
        row.appliesTo === "organization"
          ? "Deze code is alleen voor zakelijke aankopen."
          : "Deze code is alleen voor consumer-aankopen.",
      code: "WRONG_AUDIENCE",
    };
  }
  if (row.minimumSeats && (args.seats ?? 1) < row.minimumSeats) {
    return {
      success: false,
      error: `Deze code vereist minimaal ${row.minimumSeats} gebruikers.`,
      code: "MIN_SEATS",
    };
  }

  // Discount berekenen
  let discountAmountCents = 0;
  if (row.type === "percentage") {
    discountAmountCents = Math.round(
      (args.basisAmountCents * row.value) / 100,
    );
  } else if (row.type === "fixed") {
    discountAmountCents = Math.min(row.value, args.basisAmountCents);
  }
  // free_months → geen direct kortingsbedrag, wordt vertaald naar
  // subscription.startDate in de webhook-flow.

  const payableAmountCents = Math.max(
    0,
    args.basisAmountCents - discountAmountCents,
  );

  return {
    success: true,
    discount: row,
    discountAmountCents,
    payableAmountCents,
  };
}

/** Markeer een discount-code als gebruikt (idempotent — wordt aangeroepen
 *  vanuit de webhook ALS de order is gefulfilled). */
export async function incrementDiscountRedemption(
  discountCodeId: string,
): Promise<void> {
  await db
    .update(discountCodes)
    .set({
      redemptionCount: sql`${discountCodes.redemptionCount} + 1`,
    })
    .where(eq(discountCodes.id, discountCodeId));
}

/** Genereer een unieke code in formaat `<PREFIX>-<RANDOM6>`. */
export function generateUniqueCodeSuffix(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

/** Bouwt een leesbare prefix uit een affiliate-naam: 8 chars uppercase, alleen
 *  letters/cijfers. Bv. "Reseller B.V." → "RESELLER". */
function affiliatePrefix(name: string): string {
  return (
    name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 10) || "AFF"
  );
}

/** Maak een discount-code aan die aan een affiliate is gekoppeld. */
export async function createDiscountCodeForAffiliate(args: {
  affiliateId: string;
  affiliateName: string;
  type: "percentage" | "fixed" | "free_months";
  value: number;
  appliesTo?: "consumer" | "organization" | null;
  planId?: string | null;
  minimumSeats?: number | null;
  maxRedemptions?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  customCode?: string | null;
}): Promise<DiscountCode> {
  const prefix = affiliatePrefix(args.affiliateName);
  let code =
    args.customCode?.trim().toUpperCase() ||
    `${prefix}-${generateUniqueCodeSuffix()}`;

  // Defensive: ensure uniqueness (zelden nodig — random-suffix collisions
  // zijn microscopisch).
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select({ id: discountCodes.id })
      .from(discountCodes)
      .where(eq(discountCodes.code, code))
      .limit(1);
    if (!existing) break;
    code = `${prefix}-${generateUniqueCodeSuffix()}`;
  }

  const insertValues: NewDiscountCode = {
    code,
    type: args.type,
    value: args.value,
    appliesTo: args.appliesTo ?? null,
    planId: args.planId ?? null,
    minimumSeats: args.minimumSeats ?? null,
    maxRedemptions: args.maxRedemptions ?? null,
    validFrom: args.validFrom ?? null,
    validUntil: args.validUntil ?? null,
    affiliateId: args.affiliateId,
    isActive: true,
  };

  const [row] = await db
    .insert(discountCodes)
    .values(insertValues)
    .returning();
  return row;
}

/** Lijst van discount-codes per affiliate, voor admin detail-page. */
export async function listDiscountCodesForAffiliate(
  affiliateId: string,
): Promise<DiscountCode[]> {
  return await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.affiliateId, affiliateId))
    .orderBy(desc(discountCodes.createdAt));
}

/** Toggle status van een discount-code (active/inactive). */
export async function setDiscountCodeActive(
  discountCodeId: string,
  isActive: boolean,
): Promise<void> {
  await db
    .update(discountCodes)
    .set({ isActive })
    .where(eq(discountCodes.id, discountCodeId));
}

/** Helper voor CRM: laatste gebruikte discount-code per user. Joint via
 *  orders.discountCodeId. Returns een map {userId → {code, affiliateId}}. */
export async function discountCodesForUsers(
  userIds: string[],
): Promise<
  Map<string, { codeId: string; code: string; affiliateId: string | null }>
> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: orders.userId,
      orderCreatedAt: orders.createdAt,
      codeId: discountCodes.id,
      code: discountCodes.code,
      affiliateId: discountCodes.affiliateId,
    })
    .from(orders)
    .innerJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .orderBy(asc(orders.createdAt));

  const out = new Map<
    string,
    { codeId: string; code: string; affiliateId: string | null }
  >();
  for (const r of rows) {
    if (!r.userId) continue;
    // Overschrijven met latest (we sorteren oplopend, laatste wint).
    out.set(r.userId, {
      codeId: r.codeId,
      code: r.code,
      affiliateId: r.affiliateId,
    });
  }
  return out;
}
