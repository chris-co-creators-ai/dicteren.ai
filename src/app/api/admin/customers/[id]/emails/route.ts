// Dicteren.ai — Resend-mailhistorie van één klant (staff-only).
//
// On-demand: wordt pas aangeroepen als de AM de E-mail-tab van het CRM
// side-panel opent — NOOIT meegeladen in de lijst-query (N+1-killer). Levert
// elke via Resend verstuurde mail aan deze user (op user_id én op e-mailadres,
// zodat pre-account mails op het adres ook meekomen).

import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema";
import { emailLogs } from "@/lib/db/schema/communication";
import { requireStaffApi } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;

  // E-mailadres erbij pakken zodat mails die vóór account-koppeling op het
  // adres zijn verstuurd (license-mail, betaal-link) ook meekomen.
  const [user] = await db
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.id, id))
    .limit(1);

  const where = user?.email
    ? or(eq(emailLogs.userId, id), eq(emailLogs.toAddress, user.email))
    : eq(emailLogs.userId, id);

  const rows = await db
    .select({
      id: emailLogs.id,
      subject: emailLogs.subject,
      category: emailLogs.category,
      status: emailLogs.status,
      toAddress: emailLogs.toAddress,
      resendId: emailLogs.resendId,
      sentAt: emailLogs.sentAt,
      deliveredAt: emailLogs.deliveredAt,
      lastEventAt: emailLogs.lastEventAt,
    })
    .from(emailLogs)
    .where(where)
    .orderBy(desc(emailLogs.sentAt))
    .limit(100);

  return NextResponse.json({
    success: true,
    emails: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      category: r.category,
      status: r.status,
      toAddress: r.toAddress,
      resendId: r.resendId,
      sentAt: r.sentAt.toISOString(),
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      lastEventAt: r.lastEventAt?.toISOString() ?? null,
    })),
  });
}
