// Dicteren.ai — Seat toewijzen via invite
//
// Owner wijst een specifieke vrije seat (license-row) toe aan een email.
// We maken een Better Auth invitation, koppelen die aan deze seat via
// licenses.invitationId, en versturen de welkomstmail mét de specifieke code.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { authInvitation } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/session";
import { getMembership, getOrgInfo } from "@/lib/services";
import { reserveSeatForInvitation } from "@/lib/services/orgSeats";
import { logEvent } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { sendOrganizationInviteEmail } from "@/lib/services/email";
import { appBase } from "@/lib/url";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; seatId: string }>;

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const { id: orgId, seatId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const blocked = await enforceRateLimit(request, "org:seat_assign", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  const membership = await getMembership({
    userId: session.user.id,
    organizationId: orgId,
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { success: false, error: "Alleen beheerders mogen seats toewijzen." },
      { status: 403 },
    );
  }

  let body: { email?: string; role?: "member" | "admin" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "member";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: "Geldig e-mailadres vereist." },
      { status: 400 },
    );
  }

  // Verify seat behoort tot deze org en is vrij
  const [seat] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, seatId))
    .limit(1);
  if (!seat || seat.organizationId !== orgId || seat.type !== "team") {
    return NextResponse.json(
      { success: false, error: "Seat niet gevonden in deze organisatie." },
      { status: 404 },
    );
  }
  if (seat.userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Seat is al toegewezen aan een lid.",
        code: "ALREADY_ASSIGNED",
      },
      { status: 409 },
    );
  }
  if (seat.status === "revoked" || seat.status === "refunded") {
    return NextResponse.json(
      {
        success: false,
        error: "Deze seat is niet meer beschikbaar.",
        code: "SEAT_REVOKED",
      },
      { status: 410 },
    );
  }
  // Een delta-seat uit een seat-uitbreiding blijft 'pending_payment' tot de
  // pro-rata betaald is. Niet toewijzen voor de betaling binnen is — anders
  // krijgt een lid een actieve code zonder dat ervoor betaald is.
  if (seat.status === "pending_payment") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Deze seat wacht nog op betalingsbevestiging. Probeer het zo opnieuw.",
        code: "SEAT_PENDING_PAYMENT",
      },
      { status: 409 },
    );
  }

  // Direct insert in auth.invitation — skip Better Auth's API om de
  // sendInvitationEmail-callback te vermijden (we sturen handmatig met code).
  // Verloopt na 48 uur (Better Auth's default).
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const [invitation] = await dbAuth
    .insert(authInvitation)
    .values({
      organizationId: orgId,
      email,
      role,
      status: "pending",
      inviterId: session.user.id,
      expiresAt,
    })
    .returning({ id: authInvitation.id });

  if (!invitation?.id) {
    return NextResponse.json(
      { success: false, error: "Invite-aanmaken mislukte." },
      { status: 502 },
    );
  }

  // Koppel deze invite aan de gekozen seat
  await reserveSeatForInvitation({
    licenseId: seatId,
    invitationId: invitation.id,
    actorUserId: session.user.id,
  });

  // Stuur invite-mail met de specifieke licentiecode
  const org = await getOrgInfo(orgId);
  const inviteUrl = `${appBase()}/auth/accept-invitation/${invitation.id}`;
  void sendOrganizationInviteEmail({
    to: email,
    inviterName: session.user.name ?? session.user.email,
    organizationName: org?.name ?? "Dicteren.ai",
    inviteUrl,
    licenseCode: seat.code,
  });

  await logEvent({
    action: "organization.member_invited",
    entityType: "organization",
    entityId: orgId,
    actorId: session.user.id,
    metadata: {
      email,
      role,
      invitationId: invitation.id,
      seatId,
      orgName: org?.name,
    },
  });

  return NextResponse.json({
    success: true,
    invitationId: invitation.id,
    seatId,
    email,
    role,
    licenseCode: seat.code,
  });
}
