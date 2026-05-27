// Dicteren.ai — Maandelijkse payout-cron op de 25e
//
// Voor elke affiliate met `payable`-commissions die in totaal boven de
// minimum_payout_cents drempel uitkomen:
//   1. Maak affiliate_payouts batch-rij (status: scheduled)
//   2. Koppel alle payable commissions via payout_id
//   3. Email naar affiliate met overzicht en bedrag
//   4. Audit-log
//
// Admin doet daadwerkelijke SEPA-overboeking handmatig. Markeert daarna
// batch als paid via /admin/affiliates/payouts — die flow flipt
// commissions naar 'paid'.

import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateCommissions,
  affiliatePayouts,
  affiliates,
} from "@/lib/db/schema";
import { logEvent } from "@/lib/services/audit";
import { sendAffiliatePayoutScheduledEmail } from "@/lib/services/affiliateEmail";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1; // 1-12

  // Aggregaat: sum payable per active affiliate
  const sums = await db
    .select({
      affiliateId: affiliateCommissions.affiliateId,
      totalCents: sql<number>`sum(${affiliateCommissions.amountCents})::int`,
      commissionCount: sql<number>`count(*)::int`,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliates.id, affiliateCommissions.affiliateId))
    .where(
      and(
        eq(affiliateCommissions.status, "payable"),
        sql`${affiliateCommissions.payoutId} IS NULL`,
      ),
    )
    .groupBy(affiliateCommissions.affiliateId);

  let batched = 0;
  let belowThreshold = 0;
  let mailFailed = 0;

  for (const s of sums) {
    if (!s.affiliateId) continue;
    const [aff] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, s.affiliateId))
      .limit(1);
    if (!aff || aff.status !== "active") continue;

    if (s.totalCents < aff.minimumPayoutCents) {
      belowThreshold++;
      continue;
    }

    // Insert batch — UNIQUE op (affiliateId, periodYear, periodMonth)
    let payoutRow: { id: string } | null = null;
    try {
      const [r] = await db
        .insert(affiliatePayouts)
        .values({
          affiliateId: aff.id,
          periodYear,
          periodMonth,
          totalCents: s.totalCents,
          commissionCount: s.commissionCount,
          status: "scheduled",
        })
        .onConflictDoNothing({
          target: [
            affiliatePayouts.affiliateId,
            affiliatePayouts.periodYear,
            affiliatePayouts.periodMonth,
          ],
        })
        .returning({ id: affiliatePayouts.id });
      payoutRow = r ?? null;
    } catch (err) {
      console.warn("[monthly-affiliate-payout] insert failed", err);
      continue;
    }
    if (!payoutRow) {
      // Batch bestond al voor deze maand — skip om dubbele mails te
      // voorkomen.
      continue;
    }

    // Koppel commissions aan deze payout-batch
    await db
      .update(affiliateCommissions)
      .set({ payoutId: payoutRow.id, updatedAt: new Date() })
      .where(
        and(
          eq(affiliateCommissions.affiliateId, aff.id),
          eq(affiliateCommissions.status, "payable"),
          sql`${affiliateCommissions.payoutId} IS NULL`,
        ),
      );

    await logEvent({
      action: "affiliate.commission_status_changed",
      entityType: "affiliate",
      entityId: aff.id,
      metadata: {
        action: "payout_batched",
        payoutId: payoutRow.id,
        totalCents: s.totalCents,
        commissionCount: s.commissionCount,
        periodYear,
        periodMonth,
      },
    });

    // Stuur email naar affiliate
    const mail = await sendAffiliatePayoutScheduledEmail({
      to: aff.contactEmail,
      name: aff.displayName ?? aff.name,
      totalCents: s.totalCents,
      currency: "EUR",
      commissionCount: s.commissionCount,
      periodYear,
      periodMonth,
    });
    if (!mail.success) {
      mailFailed++;
      console.warn("[monthly-affiliate-payout] mail failed", mail.error, mail.code);
    }

    batched++;
  }

  return NextResponse.json({
    ok: true,
    affiliatesProcessed: sums.length,
    batched,
    belowThreshold,
    mailFailed,
    periodYear,
    periodMonth,
  });
}
