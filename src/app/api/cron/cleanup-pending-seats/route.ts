// Dicteren.ai — Hourly cleanup van pending_payment seats
//
// Seats die langer dan 2u in pending_payment hangen (pro-rata charge
// is gefaald of nooit voltooid) worden gemarkeerd als revoked.

import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { logEvent } from "@/lib/services/audit";

const TIMEOUT_MINUTES = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  const stale = await db
    .update(licenses)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(licenses.status, "pending_payment"),
        lt(licenses.createdAt, cutoff),
      ),
    )
    .returning({ id: licenses.id, organizationId: licenses.organizationId });

  for (const s of stale) {
    if (s.organizationId) {
      await logEvent({
        action: "organization.subscription_failed",
        entityType: "organization",
        entityId: s.organizationId,
        metadata: {
          reason: "pending_seat_timeout",
          licenseId: s.id,
          timeoutMinutes: TIMEOUT_MINUTES,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, revoked: stale.length });
}
