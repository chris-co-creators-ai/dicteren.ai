// Dicteren.ai — Admin: mark payout-batch als paid
//
// Flipt batch → status='paid'. Alle commissions met deze payoutId krijgen
// status='paid' en paidAt=now(). Bumpt affiliates.totalPaidCents.
// Stuurt confirmation-mail naar de affiliate.

import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateCommissions,
  affiliatePayouts,
  affiliates,
} from "@/lib/db/schema";
import { requireStaffApi } from "@/lib/auth/session";
import { sendAffiliatePayoutPaidEmail } from "@/lib/services/affiliateEmail";
import { logEvent } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Geldmutatie: alleen admin, net als de payouts-pagina zelf (was staff-breed).
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id: payoutId } = await params;

  let body: { sepaBatchRef?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const [payout] = await db
    .select()
    .from(affiliatePayouts)
    .where(eq(affiliatePayouts.id, payoutId))
    .limit(1);
  if (!payout) {
    return NextResponse.json(
      { success: false, error: "Payout niet gevonden" },
      { status: 404 },
    );
  }
  if (payout.status === "paid") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  const now = new Date();

  // Flip batch
  await db
    .update(affiliatePayouts)
    .set({
      status: "paid",
      paidAt: now,
      sepaBatchRef: body.sepaBatchRef ?? payout.sepaBatchRef,
      updatedAt: now,
    })
    .where(eq(affiliatePayouts.id, payoutId));

  // Flip commissions in batch
  const flipped = await db
    .update(affiliateCommissions)
    .set({
      status: "paid",
      paidAt: now,
      paidReference: body.sepaBatchRef ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(affiliateCommissions.payoutId, payoutId),
        eq(affiliateCommissions.status, "payable"),
      ),
    )
    .returning({ id: affiliateCommissions.id });

  // Bump affiliate.totalPaidCents
  await db
    .update(affiliates)
    .set({
      totalPaidCents: sql`${affiliates.totalPaidCents} + ${payout.totalCents}`,
      updatedAt: now,
    })
    .where(eq(affiliates.id, payout.affiliateId));

  // Lookup affiliate voor mail
  const [aff] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, payout.affiliateId))
    .limit(1);
  if (aff) {
    void sendAffiliatePayoutPaidEmail({
      to: aff.contactEmail,
      name: aff.displayName ?? aff.name,
      totalCents: payout.totalCents,
      currency: "EUR",
      sepaBatchRef: body.sepaBatchRef ?? payout.sepaBatchRef ?? undefined,
      periodYear: payout.periodYear,
      periodMonth: payout.periodMonth,
      userId: aff.userId ?? undefined,
    });
  }

  await logEvent({
    action: "affiliate.commission_status_changed",
    entityType: "affiliate",
    entityId: payout.affiliateId,
    actorId: session.user.id,
    metadata: {
      payoutId,
      action: "marked_paid",
      totalCents: payout.totalCents,
      sepaBatchRef: body.sepaBatchRef,
      flippedCommissions: flipped.length,
    },
  });

  return NextResponse.json({
    success: true,
    flippedCommissions: flipped.length,
  });
}
