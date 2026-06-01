// Dicteren.ai — Affiliate service
//
// Commerciële resellers (NIET hetzelfde als partnerOrganizations =
// maatschappelijke outreach). Lifetime attributie via affiliate_referrals.
// First-touch wins (uniek op userId).

import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
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
import {
  calculateRuleCommissionCents,
  calculateUnlocksAt,
  customerTypeFromPlanType,
  monthsSince,
  pickCommissionRule,
  type CustomerTypeKey,
} from "./affiliateRules";
import { normalizeEmail } from "./emailNormalize";

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

/** Koppel een pas-aangemaakte user aan een bestaande affiliate op e-mail.
 *  Dit is de ENIGE brug login↔affiliate: zonder user_id ziet een reseller
 *  zijn dashboard nooit. Match op exact-lowercase + plus-genormaliseerd, en
 *  alleen op nog niet-gekoppelde affiliates. Race-veilig via de WHERE-guard;
 *  bij unique-violation (user hangt al aan andere affiliate) → no-op. */
export async function linkAffiliateToUserByEmail(args: {
  userId: string;
  email: string;
}): Promise<string | null> {
  const lower = args.email.trim().toLowerCase();
  if (!lower) return null;
  const norm = normalizeEmail(lower);
  const [aff] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(
      and(
        or(
          sql`lower(${affiliates.contactEmail}) = ${lower}`,
          sql`lower(${affiliates.contactEmail}) = ${norm}`,
        ),
        sql`${affiliates.userId} IS NULL`,
      ),
    )
    .limit(1);
  if (!aff) return null;
  try {
    const [updated] = await db
      .update(affiliates)
      .set({ userId: args.userId })
      .where(
        and(eq(affiliates.id, aff.id), sql`${affiliates.userId} IS NULL`),
      )
      .returning({ id: affiliates.id });
    return updated?.id ?? null;
  } catch {
    return null;
  }
}

/** Omgekeerde richting: koppel een affiliate aan een AL bestaande user op
 *  e-mail (reseller had al een account vóór de affiliate werd aangemaakt). */
export async function linkAffiliateToExistingUser(args: {
  affiliateId: string;
  email: string;
}): Promise<boolean> {
  const lower = args.email.trim().toLowerCase();
  if (!lower) return false;
  const norm = normalizeEmail(lower);
  const [u] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(
      or(
        sql`lower(${authUsers.email}) = ${lower}`,
        eq(authUsers.emailNormalized, norm),
      ),
    )
    .limit(1);
  if (!u) return false;
  try {
    const [updated] = await db
      .update(affiliates)
      .set({ userId: u.id })
      .where(
        and(
          eq(affiliates.id, args.affiliateId),
          sql`${affiliates.userId} IS NULL`,
        ),
      )
      .returning({ id: affiliates.id });
    return !!updated;
  } catch {
    return false;
  }
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

/** First-touch attribution: koppel user aan affiliate. Geen-op op affiliateId
 *  als al gekoppeld (lifetime first-touch), maar VUL organizationId in als
 *  die bij de bestaande referral nog leeg is en nu wel meegegeven wordt
 *  (= user kocht eerst consumer met ?ref=, daarna zakelijk met dezelfde
 *  affiliate — org-level rapportage krijgt zo nog het orgId). */
export async function attributeUserToAffiliate(args: {
  affiliateId: string;
  userId: string;
  organizationId?: string | null;
  attributionSource?: string;
}): Promise<{ created: boolean; referralId: string }> {
  // Self-referral block: een reseller mag geen commissie op zijn eigen
  // aankoop boeken. Skip de attributie als de affiliate aan deze user hangt.
  const [self] = await db
    .select({ userId: affiliates.userId })
    .from(affiliates)
    .where(eq(affiliates.id, args.affiliateId))
    .limit(1);
  if (self?.userId && self.userId === args.userId) {
    return { created: false, referralId: "" };
  }

  // Onconflict op userId — lifetime first-touch op affiliateId.
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

  // Bestaande referral. Update organizationId als nu pas bekend.
  const existing = await getReferralForUser(args.userId);
  if (
    existing &&
    args.organizationId &&
    !existing.organizationId
  ) {
    await db
      .update(affiliateReferrals)
      .set({ organizationId: args.organizationId })
      .where(eq(affiliateReferrals.id, existing.id));
  }
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

/** V2: Record commission met per-customer-type rule + lockup + sequenceNumber.
 *
 *  Returns null als:
 *    - affiliate niet active
 *    - geen commission-rule voor dit customer-type
 *    - bij renewal: duration is verstreken
 *    - commissie 0
 *
 *  Idempotent op orderId (UNIQUE).
 */
export async function recordCommissionV2(args: {
  affiliate: Affiliate;
  referral: AffiliateReferral;
  orderId: string;
  licenseId: string | null;
  paymentId: string | null;
  basisAmountCents: number;
  seats: number;
  customerType: CustomerTypeKey;
  isRenewal: boolean;
  paidAt: Date;
}): Promise<AffiliateCommission | null> {
  if (args.affiliate.status !== "active") return null;

  const monthsSinceFirstSeen = monthsSince(args.referral.firstSeenAt, args.paidAt);
  const rule = pickCommissionRule({
    affiliate: args.affiliate,
    customerType: args.customerType,
    isRenewal: args.isRenewal,
    monthsSinceFirstSeen,
  });
  if (!rule) return null;

  // Commissie over het NETTO bedrag (excl. 21% btw). De geïnde bedragen zijn
  // btw-inclusief; de btw is geen omzet (gaat naar de Belastingdienst), dus
  // de reseller verdient over de netto verkoopwaarde.
  const nettoBasisCents = Math.round(args.basisAmountCents / 1.21);
  const amountCents = calculateRuleCommissionCents({
    rule,
    basisAmountCents: nettoBasisCents,
    seats: args.seats,
  });
  if (amountCents <= 0) return null;

  const unlocksAt = calculateUnlocksAt(args.paidAt);

  // Sequence-number: per-orderId. First-payment = 1, renewal-1 = 2, etc.
  // Idempotency draait op UNIQUE(order_id, sequence_number) — een retry van
  // de webhook met dezelfde paymentId ziet hetzelfde sequenceNumber en
  // wordt door onConflictDoNothing afgevangen.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.orderId, args.orderId));
  const sequenceNumber = (count ?? 0) + 1;

  // Voor renewal: check of er al een commission met deze paymentId is
  // (webhook-retry). Skip dan.
  if (args.paymentId) {
    const [existing] = await db
      .select({ id: affiliateCommissions.id })
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.orderId, args.orderId),
          eq(affiliateCommissions.paymentId, args.paymentId),
        ),
      )
      .limit(1);
    if (existing) return null;
  }

  const [row] = await db
    .insert(affiliateCommissions)
    .values({
      affiliateId: args.affiliate.id,
      referralId: args.referral.id,
      orderId: args.orderId,
      licenseId: args.licenseId,
      paymentId: args.paymentId,
      basisAmountCents: args.basisAmountCents,
      seats: args.seats,
      commissionType: rule.type,
      commissionPct: rule.commissionPct,
      commissionFixedCents: rule.commissionFixedCents,
      amountCents,
      status: "pending",
      customerType: args.customerType === "business" ? "organization" : "consumer",
      unlocksAt,
      isRenewal: args.isRenewal,
      sequenceNumber,
    })
    .onConflictDoNothing({
      target: [
        affiliateCommissions.orderId,
        affiliateCommissions.sequenceNumber,
      ],
    })
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

/**
 * Commissie voor een AM-gesloten deal (Route C). Er is geen klant-referral
 * (de organisatie wordt pas na betaling aangemaakt) — de reseller-coupon op de
 * order koppelt de affiliate. referralId blijft daarom null. Eerste betaling,
 * dus 0 maanden sinds first-seen en isRenewal=false. Idempotent op
 * (orderId, sequenceNumber).
 */
export async function recordAmDealCommission(args: {
  affiliate: Affiliate;
  orderId: string;
  licenseId: string | null;
  paymentId: string | null;
  basisAmountCents: number;
  seats: number;
  customerType: CustomerTypeKey;
  paidAt: Date;
}): Promise<AffiliateCommission | null> {
  if (args.affiliate.status !== "active") return null;

  const rule = pickCommissionRule({
    affiliate: args.affiliate,
    customerType: args.customerType,
    isRenewal: false,
    monthsSinceFirstSeen: 0,
  });
  if (!rule) return null;

  // Commissie over netto (excl. 21% btw), zelfde regel als recordCommissionV2.
  const nettoBasisCents = Math.round(args.basisAmountCents / 1.21);
  const amountCents = calculateRuleCommissionCents({
    rule,
    basisAmountCents: nettoBasisCents,
    seats: args.seats,
  });
  if (amountCents <= 0) return null;

  const unlocksAt = calculateUnlocksAt(args.paidAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.orderId, args.orderId));
  const sequenceNumber = (count ?? 0) + 1;

  const [row] = await db
    .insert(affiliateCommissions)
    .values({
      affiliateId: args.affiliate.id,
      referralId: null,
      orderId: args.orderId,
      licenseId: args.licenseId,
      paymentId: args.paymentId,
      basisAmountCents: args.basisAmountCents,
      seats: args.seats,
      commissionType: rule.type,
      commissionPct: rule.commissionPct,
      commissionFixedCents: rule.commissionFixedCents,
      amountCents,
      status: "pending",
      customerType: args.customerType === "business" ? "organization" : "consumer",
      unlocksAt,
      isRenewal: false,
      sequenceNumber,
    })
    .onConflictDoNothing({
      target: [
        affiliateCommissions.orderId,
        affiliateCommissions.sequenceNumber,
      ],
    })
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

/** Void een commissie. Reduceert totalEarnedCents tenzij hij al paid was. */
export async function voidCommission(args: {
  commissionId: string;
  reason: "refund" | "cancel_in_lockup" | "manual_admin";
}): Promise<void> {
  const [row] = await db
    .select({
      id: affiliateCommissions.id,
      affiliateId: affiliateCommissions.affiliateId,
      amountCents: affiliateCommissions.amountCents,
      status: affiliateCommissions.status,
    })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.id, args.commissionId))
    .limit(1);
  if (!row) return;
  if (row.status === "voided" || row.status === "paid") return;

  await db
    .update(affiliateCommissions)
    .set({
      status: "voided",
      voidedReason: args.reason,
      updatedAt: new Date(),
    })
    .where(eq(affiliateCommissions.id, args.commissionId));

  // Verminder de totalEarnedCents (was nog niet uitbetaald).
  await db
    .update(affiliates)
    .set({
      totalEarnedCents: sql`GREATEST(0, ${affiliates.totalEarnedCents} - ${row.amountCents})`,
      updatedAt: new Date(),
    })
    .where(eq(affiliates.id, row.affiliateId));
}

/** Void alle non-paid commissions voor een orderId. Voor refund-flow. */
export async function voidCommissionsForOrder(args: {
  orderId: string;
  reason: "refund" | "cancel_in_lockup";
}): Promise<{ voidedCount: number }> {
  const rows = await db
    .select({
      id: affiliateCommissions.id,
      status: affiliateCommissions.status,
    })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.orderId, args.orderId));
  let count = 0;
  for (const r of rows) {
    if (r.status === "pending" || r.status === "payable") {
      await voidCommission({ commissionId: r.id, reason: args.reason });
      count++;
    }
  }
  return { voidedCount: count };
}

/** Type-helper voor `customer_type` enum-cast naar onze CustomerTypeKey. */
export function customerTypeFromOrderPlan(
  planCustomerType: "consumer" | "organization",
): CustomerTypeKey {
  return customerTypeFromPlanType(planCustomerType);
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

  // Koppel meteen aan een bestaande user als de reseller al een account heeft.
  // Zo niet, dan koppelt de auth after-hook zodra de reseller zich aanmeldt.
  if (!args.userId) {
    await linkAffiliateToExistingUser({
      affiliateId: row.id,
      email: args.contactEmail,
    });
    const refreshed = await getAffiliateById(row.id);
    if (refreshed) return refreshed;
  }
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
