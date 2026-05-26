// Dicteren.ai — Seat verplaatsen naar een ander member
//
// Owner verplaatst een seat van member A naar member B. Devices van A worden
// gerevoked, B krijgt de invite-flow (als nog niet member) of directe assign.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { authMember, authUser } from "@/lib/db/auth-schema";
import { auth } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import {
  assignSeatToMember,
  reserveSeatForInvitation,
  revokeAllActivationsForMember,
} from "@/lib/services/orgSeats";
import { logEvent } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { and } from "drizzle-orm";

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

  const blocked = await enforceRateLimit(request, "org:seat_reassign", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  const membership = await getMembership({
    userId: session.user.id,
    organizationId: orgId,
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { success: false, error: "Alleen beheerders mogen seats verplaatsen." },
      { status: 403 },
    );
  }

  let body: { toEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt." },
      { status: 400 },
    );
  }

  const toEmail = body.toEmail?.trim().toLowerCase();
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return NextResponse.json(
      { success: false, error: "Geldig e-mailadres vereist." },
      { status: 400 },
    );
  }

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

  // Revoke devices van de huidige member (als toegewezen)
  const previousUserId = seat.userId;
  if (previousUserId) {
    await revokeAllActivationsForMember({
      orgId,
      userId: previousUserId,
      actorUserId: session.user.id,
      reason: "seat_reassigned",
    });
  }

  // Kijk of de nieuwe email al bestaat als user
  const [existingUser] = await dbAuth
    .select({ id: authUser.id, email: authUser.email })
    .from(authUser)
    .where(eq(authUser.email, toEmail))
    .limit(1);

  let assigned = false;
  let invitationId: string | null = null;

  if (existingUser) {
    // Zit hij al in deze org?
    const [member] = await dbAuth
      .select({ id: authMember.id })
      .from(authMember)
      .where(
        and(
          eq(authMember.userId, existingUser.id),
          eq(authMember.organizationId, orgId),
        ),
      )
      .limit(1);

    if (member) {
      // Direct assign — bestaande member van deze org
      await assignSeatToMember({
        licenseId: seatId,
        userId: existingUser.id,
        actorUserId: session.user.id,
      });
      assigned = true;
    }
  }

  if (!assigned) {
    // Stuur invite — Better Auth maakt rij + roept onze callback
    let invitation;
    try {
      invitation = await auth.api.createInvitation({
        headers: await headers(),
        body: {
          email: toEmail,
          role: "member",
          organizationId: orgId,
        },
      });
    } catch (err) {
      console.error("[seats/reassign] createInvitation failed", err);
      return NextResponse.json(
        { success: false, error: "Versturen mislukt. Probeer opnieuw." },
        { status: 502 },
      );
    }
    if (!invitation?.id) {
      return NextResponse.json(
        { success: false, error: "Invite-aanmaken mislukte." },
        { status: 502 },
      );
    }

    invitationId = invitation.id;

    // Reserveer seat voor invite. userId blijft null tot accept.
    await db
      .update(licenses)
      .set({
        userId: null,
        invitationId: invitation.id,
        status: "active",
        assignedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(licenses.id, seatId));
  }

  await logEvent({
    action: "organization.seat_reassigned",
    entityType: "license",
    entityId: seatId,
    actorId: session.user.id,
    metadata: {
      previousUserId,
      toEmail,
      assigned,
      invitationId,
    },
  });

  return NextResponse.json({
    success: true,
    assigned,
    invitationId,
    toEmail,
  });
}
