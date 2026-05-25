// Dicteren.ai — Affiliate service
//
// Commerciële resellers (NIET hetzelfde als partnerOrganizations =
// maatschappelijke outreach). Lifetime attributie via affiliate_referrals.
// First-touch wins (uniek op userId).

import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  affiliates,
  affiliateReferrals,
  affiliateCommissions,
  authUsers,
  orders,
  licenses,
  type Affiliate,
  type AffiliateReferral,
  type AffiliateCommission,
} from "@/lib/db/schema";

export type CommissionType = "percentage" | "fixed_per_seat";
export type AffiliateStatusValue = "active" | "paused" | "disabled";

/** Genereer een unieke affiliate-code in formaat AFF-XXXXXXXX. */
export function generateAffiliateCode(): string {
  return `AFF-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Lookup affiliate by code (de URL-parameter `?ref=`). */
export async function getAffiliateByCode(
  code: string,
): Promise<Affiliate | null> {
  const [row] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.code, code))
    .limit(1);
  return row ?? null;
}

/** Lookup by id. */
export async function getAffiliateById(id: string): Promise<Affiliate | null> {
  const [row] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, id))
    .limit(1);
  return row ?? null;
}

/** Affiliate hangend aan een ingelogde reseller-user (voor /affiliate/dashboard). */
export async function getAffiliateByUserId(
  userId: string,
): Promise<Affiliate | null> {
  const [row] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Lookup referral voor user (lifetime attribution). */
export async function getReferralForUser(
  userId: string,
): Promise<AffiliateReferral | null> {
  const [row] = await db
    .select()
    .from(affiliateReferrals)
    .where(eq(affiliateReferrals.userId, userId))
    .limit(1);
  return row ?? null;
}

/** First-touch attribution: koppel user aan affiliate. Geen-op als al gekoppeld. */
export async function attributeUserToAffiliate(args: {
  affiliateId: string;
  userId: string;
  organizationId?: string | null;
  attributionSource?: string;
}): Promise<{ created: boolean; referralId: string }> {
  // Onconflict op userId — lifetime first-touch.
  const [row] = await db
    .insert(affiliateReferrals)
    .values({
      affiliateId: args.affiliateId,
      userId: args.userId,
      organizationId: args.organizationId ?? null,
      attributionSource: args.attributionSource ?? "url-ref",
    })
    .onConflictDoNothing({ target: affiliateReferrals.userId })
    .returning({ id: affiliateReferrals.id });

  if (row) return { created: true, referralId: row.id };

  // Niet ingevoegd → er bestaat al een referral voor deze user.
  const existing = await getReferralForUser(args.userId);
  return { created: false, referralId: existing!.id };
}

/** Bij eerste paid order van een referred user: update convertedAt timestamp. */
export async function markReferralConverted(args: {
  userId: string;
}): Promise<void> {
  await db
    .update(affiliateReferrals)
    .set({ convertedAt: new Date() })
    .where(
      and(
        eq(affiliateReferrals.userId, args.userId),
        sql`${affiliateReferrals.convertedAt} IS NULL`,
      ),
    );
}

/** Bereken commission-amount voor een order. */
export function calculateCommissionCents(args: {
  type: CommissionType;
  commissionPct: number;
  commissionFixedCents: number;
  basisAmountCents: number;
  seats: number;
}): number {
  if (args.type === "percentage") {
    return Math.round((args.basisAmountCents * args.commissionPct) / 100);
  }
  return args.commissionFixedCents * Math.max(1, args.seats);
}

/** Record commission voor een paid order. Idempotent op orderId. */
export async function recordCommission(args: {
  affiliate: Affiliate;
  referralId: string;
  orderId: string;
  licenseId: string | null;
  paymentId: string | null;
  basisAmountCents: number;
  seats: number;
}): Promise<AffiliateCommission | null> {
  const amountCents = calculateCommissionCents({
    type: args.affiliate.commissionType,
    commissionPct: args.affiliate.commissionPct,
    commissionFixedCents: args.affiliate.commissionFixedCents,
    basisAmountCents: args.basisAmountCents,
    seats: args.seats,
  });

  // Skip bij commissie nul — geen rij vervuilen.
  if (amountCents <= 0) return null;

  const [row] = await db
    .insert(affiliateCommissions)
    .values({
      affiliateId: args.affiliate.id,
      referralId: args.referralId,
      orderId: args.orderId,
      licenseId: args.licenseId,
      paymentId: args.paymentId,
      basisAmountCents: args.basisAmountCents,
      seats: args.seats,
      commissionType: args.affiliate.commissionType,
      commissionPct: args.affiliate.commissionPct,
      commissionFixedCents: args.affiliate.commissionFixedCents,
      amountCents,
      status: "pending",
    })
    .onConflictDoNothing({ target: affiliateCommissions.orderId })
    .returning();

  if (row) {
    await db
      .update(affiliates)
      .set({
        totalEarnedCents: sql`${affiliates.totalEarnedCents} + ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, args.affiliate.id));
  }

  return row ?? null;
}

/** Affiliate aanmaken vanuit admin. */
export async function createAffiliate(args: {
  name: string;
  contactEmail: string;
  contactPhone?: string | null;
  userId?: string | null;
  commissionType: CommissionType;
  commissionPct?: number;
  commissionFixedCents?: number;
  payoutMethod?: string | null;
  payoutDetails?: Record<string, unknown> | null;
  internalNotes?: string | null;
}): Promise<Affiliate> {
  let code = generateAffiliateCode();
  // Defensive: ensure uniqueness on first try (collision-chance is microscopic).
  for (let i = 0; i < 5; i++) {
    const existing = await getAffiliateByCode(code);
    if (!existing) break;
    code = generateAffiliateCode();
  }
  const [row] = await db
    .insert(affiliates)
    .values({
      code,
      name: args.name,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone ?? null,
      userId: args.userId ?? null,
      status: "active",
      commissionType: args.commissionType,
      commissionPct: args.commissionPct ?? 0,
      commissionFixedCents: args.commissionFixedCents ?? 0,
      payoutMethod: args.payoutMethod ?? null,
      payoutDetails: args.payoutDetails ?? null,
      internalNotes: args.internalNotes ?? null,
    })
    .returning();
  return row;
}

/** Affiliate-update vanuit admin. */
export async function updateAffiliate(
  id: string,
  patch: Partial<{
    name: string;
    contactEmail: string;
    contactPhone: string | null;
    userId: string | null;
    status: AffiliateStatusValue;
    commissionType: CommissionType;
    commissionPct: number;
    commissionFixedCents: number;
    payoutMethod: string | null;
    payoutDetails: Record<string, unknown> | null;
    internalNotes: string | null;
  }>,
): Promise<Affiliate | null> {
  const [row] = await db
    .update(affiliates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(affiliates.id, id))
    .returning();
  return row ?? null;
}

/** Lijst affiliates voor admin. */
export async function listAffiliates() {
  return await db
    .select()
    .from(affiliates)
    .orderBy(desc(affiliates.totalEarnedCents), desc(affiliates.createdAt));
}

/** Per-affiliate stats voor admin detail / reseller dashboard. */
export async function getAffiliateStats(affiliateId: string): Promise<{
  referralCount: number;
  convertedCount: number;
  pendingCents: number;
  payableCents: number;
  paidCents: number;
  recentCommissions: Array<
    AffiliateCommission & { orderId: string | null }
  >;
}> {
  const [r] = await db
    .select({
      total: sql<number>`count(*)::int`,
      converted: sql<number>`count(case when ${affiliateReferrals.convertedAt} is not null then 1 end)::int`,
    })
    .from(affiliateReferrals)
    .where(eq(affiliateReferrals.affiliateId, affiliateId));

  const [c] = await db
    .select({
      pending: sql<number>`coalesce(sum(case when ${affiliateCommissions.status} = 'pending' then ${affiliateCommissions.amountCents} else 0 end), 0)::int`,
      payable: sql<number>`coalesce(sum(case when ${affiliateCommissions.status} = 'payable' then ${affiliateCommissions.amountCents} else 0 end), 0)::int`,
      paid: sql<number>`coalesce(sum(case when ${affiliateCommissions.status} = 'paid' then ${affiliateCommissions.amountCents} else 0 end), 0)::int`,
    })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.affiliateId, affiliateId));

  const recent = await db
    .select()
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.affiliateId, affiliateId))
    .orderBy(desc(affiliateCommissions.createdAt))
    .limit(20);

  return {
    referralCount: r?.total ?? 0,
    convertedCount: r?.converted ?? 0,
    pendingCents: c?.pending ?? 0,
    payableCents: c?.payable ?? 0,
    paidCents: c?.paid ?? 0,
    recentCommissions: recent,
  };
}

/** Markeer commissions als payable / paid. Voor admin-payout-flow. */
export async function updateCommissionStatus(args: {
  commissionId: string;
  status: "pending" | "payable" | "paid" | "voided";
  paidReference?: string | null;
}): Promise<void> {
  const setData: Record<string, unknown> = {
    status: args.status,
    updatedAt: new Date(),
  };
  if (args.status === "paid") {
    setData.paidAt = new Date();
    if (args.paidReference) setData.paidReference = args.paidReference;
  }
  await db
    .update(affiliateCommissions)
    .set(setData)
    .where(eq(affiliateCommissions.id, args.commissionId));

  if (args.status === "paid") {
    // Verhoog totalPaidCents van de affiliate met dit bedrag.
    const [row] = await db
      .select({
        affiliateId: affiliateCommissions.affiliateId,
        amountCents: affiliateCommissions.amountCents,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, args.commissionId))
      .limit(1);
    if (row) {
      await db
        .update(affiliates)
        .set({
          totalPaidCents: sql`${affiliates.totalPaidCents} + ${row.amountCents}`,
          updatedAt: new Date(),
        })
        .where(eq(affiliates.id, row.affiliateId));
    }
  }
}

/** Referrals (users + hun status) voor admin detail-page / reseller dashboard. */
export async function listAffiliateReferrals(affiliateId: string) {
  return await db
    .select({
      referralId: affiliateReferrals.id,
      userId: affiliateReferrals.userId,
      userName: authUsers.name,
      userEmail: authUsers.email,
      organizationId: affiliateReferrals.organizationId,
      firstSeenAt: affiliateReferrals.firstSeenAt,
      convertedAt: affiliateReferrals.convertedAt,
    })
    .from(affiliateReferrals)
    .leftJoin(authUsers, eq(authUsers.id, affiliateReferrals.userId))
    .where(eq(affiliateReferrals.affiliateId, affiliateId))
    .orderBy(desc(affiliateReferrals.firstSeenAt));
}

/** Commissions met order + license context voor admin/reseller views. */
export async function listAffiliateCommissions(affiliateId: string) {
  return await db
    .select({
      commission: affiliateCommissions,
      orderAmount: orders.amountCents,
      licenseCode: licenses.code,
    })
    .from(affiliateCommissions)
    .leftJoin(orders, eq(orders.id, affiliateCommissions.orderId))
    .leftJoin(licenses, eq(licenses.id, affiliateCommissions.licenseId))
    .where(eq(affiliateCommissions.affiliateId, affiliateId))
    .orderBy(desc(affiliateCommissions.createdAt));
}
