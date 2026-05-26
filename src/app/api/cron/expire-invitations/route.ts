// Dicteren.ai — Daily expire-invitations cron
//
// Markeert pending invites die voorbij expiresAt zijn als 'expired',
// release't de gekoppelde seat-reservering. Audit-log per expired invite.

import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { authInvitation } from "@/lib/db/auth-schema";
import { logEvent } from "@/lib/services/audit";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Vind expired pending invites
  const expired = await dbAuth
    .select({
      id: authInvitation.id,
      organizationId: authInvitation.organizationId,
      email: authInvitation.email,
    })
    .from(authInvitation)
    .where(
      and(
        eq(authInvitation.status, "pending"),
        lt(authInvitation.expiresAt, now),
      ),
    );

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  for (const inv of expired) {
    await dbAuth
      .update(authInvitation)
      .set({ status: "expired" })
      .where(eq(authInvitation.id, inv.id));

    // Release seat-reservering
    await db
      .update(licenses)
      .set({ invitationId: null, updatedAt: new Date() })
      .where(eq(licenses.invitationId, inv.id));

    await logEvent({
      action: "organization.invitation_expired",
      entityType: "organization",
      entityId: inv.organizationId,
      metadata: { invitationId: inv.id, email: inv.email },
    });
  }

  return NextResponse.json({ ok: true, expired: expired.length });
}
