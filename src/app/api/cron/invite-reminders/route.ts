// Dicteren.ai — Daily invite-reminders cron
//
// Voor alle pending invites die ≥24u oud zijn en NOG NIET een reminder
// kregen: stuur de reminder-mail. Dedup via invite_reminders_sent.

import { NextResponse } from "next/server";
import { and, eq, lt, gt, isNull } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { inviteRemindersSent, licenses } from "@/lib/db/schema";
import { authInvitation, authOrg, authUser } from "@/lib/db/auth-schema";
import { sendOrgInviteReminderEmail } from "@/lib/services/orgEmail";
import { appBase } from "@/lib/url";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoffOld = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  // Pending invites die ouder zijn dan 24u en nog niet expired
  const candidates = await dbAuth
    .select({
      id: authInvitation.id,
      email: authInvitation.email,
      organizationId: authInvitation.organizationId,
      expiresAt: authInvitation.expiresAt,
      inviterId: authInvitation.inviterId,
      createdAt: authInvitation.createdAt,
    })
    .from(authInvitation)
    .where(
      and(
        eq(authInvitation.status, "pending"),
        lt(authInvitation.createdAt, cutoffOld),
        gt(authInvitation.expiresAt, now),
      ),
    );

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  for (const inv of candidates) {
    // Dedup: al een reminder verstuurd?
    const [existing] = await db
      .select()
      .from(inviteRemindersSent)
      .where(eq(inviteRemindersSent.invitationId, inv.id))
      .limit(1);
    if (existing) continue;

    // Lookup gekoppelde seat-code, org-naam, inviter-naam
    const [seat] = await db
      .select({ code: licenses.code })
      .from(licenses)
      .where(eq(licenses.invitationId, inv.id))
      .limit(1);

    // Geen seat = geen code = skip (oude invites zonder per-seat-koppeling)
    if (!seat?.code) continue;

    const [org] = await dbAuth
      .select({ name: authOrg.name })
      .from(authOrg)
      .where(eq(authOrg.id, inv.organizationId))
      .limit(1);
    const [inviter] = await dbAuth
      .select({ name: authUser.name, email: authUser.email })
      .from(authUser)
      .where(eq(authUser.id, inv.inviterId))
      .limit(1);

    const inviteUrl = `${appBase()}/auth/accept-invitation/${inv.id}`;

    const result = await sendOrgInviteReminderEmail({
      to: inv.email,
      organizationName: org?.name ?? "Dicteren.ai",
      inviterName: inviter?.name ?? inviter?.email ?? "Het team",
      inviteUrl,
      licenseCode: seat.code,
      expiresAt: inv.expiresAt,
    });

    if (result.success) {
      await db.insert(inviteRemindersSent).values({
        invitationId: inv.id,
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}

// Stille no-op om eslint-import te valideren
void isNull;
