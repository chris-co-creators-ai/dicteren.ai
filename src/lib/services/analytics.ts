// Dicteren.ai — SaaS-analytics service.
// Echte MRR/ARR + funnel + pipeline + affiliate-business + churn + engagement.

import "server-only";
import { and, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateCommissions,
  affiliates as affiliatesTable,
  customerAttributes,
  emailLogs,
  licenses,
  orders,
  plans,
  subscriptions,
  authUsers,
} from "@/lib/db/schema";

/** MRR per actieve subscription = amountCents / period-months. */
export async function getMrrArrSummary(): Promise<{
  mrrCents: number;
  arrCents: number;
  activeSubs: number;
  pastDueSubs: number;
  pastDueRevenueAtRiskCents: number;
}> {
  const rows = await db
    .select({
      status: subscriptions.status,
      amountCents: subscriptions.amountCents,
      seats: subscriptions.seats,
      planPeriod: plans.period,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(plans.id, subscriptions.planId));

  let mrrCents = 0;
  let activeSubs = 0;
  let pastDueSubs = 0;
  let pastDueRevenueAtRiskCents = 0;

  for (const r of rows) {
    const months =
      r.planPeriod === "monthly"
        ? 1
        : r.planPeriod === "quarterly"
          ? 3
          : r.planPeriod === "yearly"
            ? 12
            : 0;
    if (months === 0) continue;
    const monthly = Math.round(r.amountCents / months);
    if (r.status === "active") {
      mrrCents += monthly;
      activeSubs += 1;
    } else if (r.status === "past_due") {
      pastDueSubs += 1;
      pastDueRevenueAtRiskCents += monthly;
    }
  }

  return {
    mrrCents,
    arrCents: mrrCents * 12,
    activeSubs,
    pastDueSubs,
    pastDueRevenueAtRiskCents,
  };
}

/** Verkoopfunnel: # users → trial-active → trial-converted → paid → renewal. */
export async function getTrialConversionRate(): Promise<{
  totalUsers: number;
  trialUsers: number;
  paidUsers: number;
  conversionPct: number;
}> {
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)::int` })
    .from(authUsers);

  const trialRows = await db
    .select({ userId: licenses.userId })
    .from(licenses)
    .where(sql`${licenses.code} like 'DIC-TRIAL-%'`)
    .groupBy(licenses.userId);

  const paidRows = await db
    .select({ userId: licenses.userId })
    .from(licenses)
    .where(
      and(
        sql`${licenses.code} not like 'DIC-TRIAL-%'`,
        ne(licenses.type, "partner"),
        eq(licenses.status, "active"),
      ),
    )
    .groupBy(licenses.userId);

  const trialSet = new Set(trialRows.map((r) => r.userId).filter(Boolean));
  const paidSet = new Set(paidRows.map((r) => r.userId).filter(Boolean));
  const trialToPaid = [...trialSet].filter((u) => paidSet.has(u as string));

  const conversionPct =
    trialSet.size > 0
      ? Math.round((trialToPaid.length / trialSet.size) * 100)
      : 0;

  return {
    totalUsers,
    trialUsers: trialSet.size,
    paidUsers: paidSet.size,
    conversionPct,
  };
}

/** Stages-verdeling uit customer_attributes voor pipeline-funnel. */
export async function getPipelineCounts(): Promise<{
  lead: number;
  prospect: number;
  mql: number;
  sql: number;
  customer: number;
  lost: number;
  churned: number;
  total: number;
}> {
  const rows = await db
    .select({
      stage: customerAttributes.stage,
      n: sql<number>`count(*)::int`,
    })
    .from(customerAttributes)
    .groupBy(customerAttributes.stage);

  const init = {
    lead: 0,
    prospect: 0,
    mql: 0,
    sql: 0,
    customer: 0,
    lost: 0,
    churned: 0,
    total: 0,
  };
  for (const r of rows) {
    if (!r.stage) continue;
    init[r.stage as keyof typeof init] = r.n;
    init.total += r.n;
  }
  return init;
}

/** Affiliate-overzicht: actief + uitstaand. */
export async function getAffiliateBusinessSummary(): Promise<{
  affiliateCount: number;
  activeCount: number;
  pendingCount: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  outstandingCents: number;
  pendingCommissionCount: number;
  payableCommissionCents: number;
}> {
  const affRows = await db
    .select({
      status: affiliatesTable.status,
      totalEarnedCents: affiliatesTable.totalEarnedCents,
      totalPaidCents: affiliatesTable.totalPaidCents,
    })
    .from(affiliatesTable);

  let activeCount = 0;
  let pendingCount = 0;
  let totalEarned = 0;
  let totalPaid = 0;
  for (const a of affRows) {
    if (a.status === "active") activeCount += 1;
    if (a.status === "pending") pendingCount += 1;
    totalEarned += a.totalEarnedCents;
    totalPaid += a.totalPaidCents;
  }

  const [{ payableCents, pendingCount: pendingComms }] = await db
    .select({
      payableCents: sql<number>`coalesce(sum(case when ${affiliateCommissions.status} = 'payable' then ${affiliateCommissions.amountCents} else 0 end), 0)::int`,
      pendingCount: sql<number>`count(case when ${affiliateCommissions.status} = 'pending' then 1 end)::int`,
    })
    .from(affiliateCommissions);

  return {
    affiliateCount: affRows.length,
    activeCount,
    pendingCount,
    totalEarnedCents: totalEarned,
    totalPaidCents: totalPaid,
    outstandingCents: totalEarned - totalPaid,
    pendingCommissionCount: pendingComms,
    payableCommissionCents: payableCents,
  };
}

/** Top affiliates op verdiende commissie. */
export async function getTopAffiliates(limit = 5) {
  return await db
    .select({
      id: affiliatesTable.id,
      name: affiliatesTable.name,
      code: affiliatesTable.code,
      status: affiliatesTable.status,
      totalEarnedCents: affiliatesTable.totalEarnedCents,
    })
    .from(affiliatesTable)
    .orderBy(desc(affiliatesTable.totalEarnedCents))
    .limit(limit);
}

/** Revenue laatste N dagen, opbrengst gegroepeerd per dag. */
export async function getRevenueLastNDays(
  days = 30,
): Promise<{ date: string; cents: number }[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({
      day: sql<string>`to_char(${orders.paidAt}, 'YYYY-MM-DD')`,
      cents: sql<number>`coalesce(sum(${orders.amountCents}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.paidAt, since)))
    .groupBy(sql`to_char(${orders.paidAt}, 'YYYY-MM-DD')`);

  // Dense series — vul ontbrekende dagen met 0
  const map = new Map(rows.map((r) => [r.day, r.cents]));
  const out: { date: string; cents: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, cents: map.get(key) ?? 0 });
  }
  return out;
}

/** Recente paid orders voor activity feed. */
export async function getRecentPaidOrders(limit = 10) {
  return await db
    .select({
      orderId: orders.id,
      amountCents: orders.amountCents,
      currency: orders.currency,
      paidAt: orders.paidAt,
      quantity: orders.quantity,
      planLabel: plans.label,
      planSlug: plans.slug,
      customerEmail: authUsers.email,
      customerName: authUsers.name,
    })
    .from(orders)
    .leftJoin(plans, eq(plans.id, orders.planId))
    .leftJoin(authUsers, eq(authUsers.id, orders.userId))
    .where(eq(orders.status, "paid"))
    .orderBy(desc(orders.paidAt))
    .limit(limit);
}

/** Subscriptions die past-due staan met klant-context voor admin-actie. */
export async function getPastDueWatchlist(limit = 10) {
  return await db
    .select({
      subscriptionId: subscriptions.id,
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      amountCents: subscriptions.amountCents,
      nextBillingAt: subscriptions.nextBillingAt,
      planLabel: plans.label,
      customerEmail: authUsers.email,
      customerName: authUsers.name,
      userId: subscriptions.userId,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .leftJoin(authUsers, eq(authUsers.id, subscriptions.userId))
    .where(eq(subscriptions.status, "past_due"))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(limit);
}

/** Email engagement laatste 30 dagen. */
export async function getEmailEngagement30d(): Promise<{
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRatePct: number;
  clickRatePct: number;
}> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db
    .select({
      status: emailLogs.status,
      n: sql<number>`count(*)::int`,
    })
    .from(emailLogs)
    .where(gte(emailLogs.sentAt, since))
    .groupBy(emailLogs.status);

  const map = new Map(rows.map((r) => [r.status, r.n]));
  const sent = (map.get("sent") ?? 0) +
    (map.get("delivered") ?? 0) +
    (map.get("opened") ?? 0) +
    (map.get("clicked") ?? 0) +
    (map.get("bounced") ?? 0) +
    (map.get("complained") ?? 0) +
    (map.get("failed") ?? 0);
  const delivered = (map.get("delivered") ?? 0) +
    (map.get("opened") ?? 0) +
    (map.get("clicked") ?? 0);
  const opened = (map.get("opened") ?? 0) + (map.get("clicked") ?? 0);
  const clicked = map.get("clicked") ?? 0;
  const bounced = (map.get("bounced") ?? 0) + (map.get("complained") ?? 0);

  return {
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    openRatePct: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    clickRatePct: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
  };
}

/** Breakdown van actieve subs per plan voor revenue-mix. */
export async function getActiveSubBreakdown(): Promise<
  Array<{ planSlug: string; planLabel: string; count: number; mrrCents: number }>
> {
  const rows = await db
    .select({
      planSlug: plans.slug,
      planLabel: plans.label,
      planPeriod: plans.period,
      amountCents: subscriptions.amountCents,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.status, "active"));

  const map = new Map<string, { label: string; count: number; mrr: number }>();
  for (const r of rows) {
    const months =
      r.planPeriod === "monthly"
        ? 1
        : r.planPeriod === "quarterly"
          ? 3
          : r.planPeriod === "yearly"
            ? 12
            : 0;
    if (months === 0) continue;
    const monthly = Math.round(r.amountCents / months);
    const cur = map.get(r.planSlug);
    if (cur) {
      cur.count += 1;
      cur.mrr += monthly;
    } else {
      map.set(r.planSlug, {
        label: r.planLabel,
        count: 1,
        mrr: monthly,
      });
    }
  }
  return Array.from(map.entries()).map(([slug, v]) => ({
    planSlug: slug,
    planLabel: v.label,
    count: v.count,
    mrrCents: v.mrr,
  }));
}
