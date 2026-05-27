// Dicteren.ai — Werkelijke B2B MRR-timeline op basis van Mollie-data
//
// Voor een lijst peil-datums (mijlpalen) geeft deze service per datum
// het aantal actieve zakelijke klanten + de werkelijke MRR (in cents)
// terug. "Actief op datum X" = subscription aangemaakt vóór X én niet
// gecancelled vóór X.
//
// MRR-normalisatie per interval:
//   monthly   → amount_cents
//   quarterly → amount_cents / 3
//   yearly    → amount_cents / 12
//   lifetime  → 0 (geen recurring)

import "server-only";
import { and, eq, isNull, lte, or, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";

const PERIOD_DIVISOR: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
  lifetime: 0,
};

export type RevenuePoint = {
  date: string;        // YYYY-MM-DD
  customerCount: number;
  mrrCents: number;
};

export async function getActualB2BMrrAt(at: Date): Promise<{
  customerCount: number;
  mrrCents: number;
}> {
  const rows = await db
    .select({
      organizationId: subscriptions.organizationId,
      amountCents: subscriptions.amountCents,
      period: plans.period,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(plans.customerType, "organization"),
        lte(subscriptions.createdAt, at),
        or(
          isNull(subscriptions.canceledAt),
          gt(subscriptions.canceledAt, at),
        ),
      ),
    );

  let mrr = 0;
  const orgs = new Set<string>();
  for (const r of rows) {
    const divisor = PERIOD_DIVISOR[r.period as string] ?? 0;
    if (divisor === 0) continue;
    mrr += Math.round(r.amountCents / divisor);
    if (r.organizationId) orgs.add(r.organizationId);
  }
  return { customerCount: orgs.size, mrrCents: mrr };
}

export async function getActualB2BMrrTimeline(
  dates: Date[],
): Promise<RevenuePoint[]> {
  const results = await Promise.all(
    dates.map(async (d) => {
      const { customerCount, mrrCents } = await getActualB2BMrrAt(d);
      return {
        date: d.toISOString().slice(0, 10),
        customerCount,
        mrrCents,
      };
    }),
  );
  return results;
}
