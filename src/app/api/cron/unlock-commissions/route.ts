// Dicteren.ai — Daily cron: flip pending commissions → payable
//
// Voor commissions waar:
//   - status = 'pending'
//   - unlocks_at <= now()
//   - order.status = 'paid' (niet refunded)
//
// Voiden (refund / cancel-in-lockup) is al gebeurd in de webhook/cancel-
// routes. Deze cron doet alleen de positieve flip.

import { NextResponse } from "next/server";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateCommissions, orders } from "@/lib/db/schema";
import { logEvent } from "@/lib/services/audit";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Pak de eligible commissions met JOIN op orders om paid-status te checken.
  const eligible = await db
    .select({
      id: affiliateCommissions.id,
      affiliateId: affiliateCommissions.affiliateId,
      amountCents: affiliateCommissions.amountCents,
      orderStatus: orders.status,
    })
    .from(affiliateCommissions)
    .innerJoin(orders, eq(orders.id, affiliateCommissions.orderId))
    .where(
      and(
        eq(affiliateCommissions.status, "pending"),
        lte(affiliateCommissions.unlocksAt, now),
      ),
    );

  let unlocked = 0;
  let skipped = 0;

  for (const row of eligible) {
    if (row.orderStatus !== "paid") {
      // Order is intussen refunded/canceled — skip. De refund-handler heeft
      // 'm al gevoid; defensieve check.
      skipped++;
      continue;
    }
    const result = await db
      .update(affiliateCommissions)
      .set({ status: "payable", updatedAt: new Date() })
      .where(
        and(
          eq(affiliateCommissions.id, row.id),
          eq(affiliateCommissions.status, "pending"),
        ),
      )
      .returning({ id: affiliateCommissions.id });
    if (result.length > 0) {
      unlocked++;
      await logEvent({
        action: "affiliate.commission_status_changed",
        entityType: "affiliate",
        entityId: row.affiliateId,
        metadata: {
          commissionId: row.id,
          from: "pending",
          to: "payable",
          amountCents: row.amountCents,
          via: "cron_unlock_commissions",
        },
      });
    }
  }

  // Stille no-op om unused-warnings te vermijden
  void sql;

  return NextResponse.json({
    ok: true,
    checked: eligible.length,
    unlocked,
    skipped,
  });
}
