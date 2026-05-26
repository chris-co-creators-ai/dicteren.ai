// Dicteren.ai — Invitation accept-route (eigen wrapper rond Better Auth)
//
// Doet wat de auth.organization.acceptInvitation doet (member insert,
// invitation status -> accepted), plus:
//   - assign de gereserveerde seat aan de nieuwe member's userId
//   - log audit event
//   - notify owner + send welcome-mail naar member met de code
//
// Reden voor eigen wrapper: Better Auth's API mist hooks na-accept, en
// de seat-assignment moet plaatsvinden ON accept (niet later via cron).

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import {
  licenses,
} from "@/lib/db/schema";
import {
  authInvitation,
  authMember,
  authOrg,
  authUser,
} from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/session";
import { assignSeatToMember, getOrgOwner } from "@/lib/services/orgSeats";
import { logEvent } from "@/lib/services/audit";
import {
  sendOrgMemberWelcomeEmail,
  sendOrgOwnerMemberJoinedEmail,
} from "@/lib/services/orgEmail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const { id: invitationId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  // Lookup invite + bijbehorende org
  const [invite] = await dbAuth
    .select({
      id: authInvitation.id,
      email: authInvitation.email,
      role: authInvitation.role,
      status: authInvitation.status,
      organizationId: authInvitation.organizationId,
      expiresAt: authInvitation.expiresAt,
      inviterId: authInvitation.inviterId,
    })
    .from(authInvitation)
    .where(eq(authInvitation.id, invitationId))
    .limit(1);

  if (!invite) {
    return NextResponse.json(
      { success: false, error: "Uitnodiging niet gevonden." },
      { status: 404 },
    );
  }
  if (invite.status !== "pending") {
    return NextResponse.json(
      {
        success: false,
        error: "Deze uitnodiging is niet meer geldig.",
        code: "INVALID_STATUS",
      },
      { status: 410 },
    );
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      {
        success: false,
        error: "Uitnodiging verlopen. Vraag een nieuwe aan.",
        code: "EXPIRED",
      },
      { status: 410 },
    );
  }
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      {
        success: false,
        error: "Deze uitnodiging is voor een ander e-mailadres.",
        code: "EMAIL_MISMATCH",
      },
      { status: 403 },
    );
  }

  // Member-row: idempotent (kan al bestaan als gebruiker eerder geaccepteerd had)
  const [existing] = await dbAuth
    .select({ id: authMember.id })
    .from(authMember)
    .where(
      and(
        eq(authMember.userId, session.user.id),
        eq(authMember.organizationId, invite.organizationId),
      ),
    )
    .limit(1);

  if (!existing) {
    await dbAuth.insert(authMember).values({
      userId: session.user.id,
      organizationId: invite.organizationId,
      role: invite.role ?? "member",
    });
  }

  // Invite → accepted
  await dbAuth
    .update(authInvitation)
    .set({ status: "accepted" })
    .where(eq(authInvitation.id, invitationId));

  // Vind de gekoppelde seat
  const [seat] = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      organizationId: licenses.organizationId,
    })
    .from(licenses)
    .where(eq(licenses.invitationId, invitationId))
    .limit(1);

  let assignedCode: string | null = null;
  if (seat) {
    await assignSeatToMember({
      licenseId: seat.id,
      userId: session.user.id,
      actorUserId: session.user.id,
    });
    assignedCode = seat.code;
  }

  // Lookup org-naam + owner voor mails
  const [org] = await dbAuth
    .select({ id: authOrg.id, name: authOrg.name })
    .from(authOrg)
    .where(eq(authOrg.id, invite.organizationId))
    .limit(1);

  const owner = await getOrgOwner(invite.organizationId);

  // Audit member_joined
  await logEvent({
    action: "organization.member_joined",
    entityType: "organization",
    entityId: invite.organizationId,
    actorId: session.user.id,
    metadata: {
      userId: session.user.id,
      role: invite.role,
      invitationId,
      seatId: seat?.id ?? null,
      orgName: org?.name,
    },
  });

  // Welcome-mail naar de nieuwe member met de code
  if (assignedCode && org) {
    void sendOrgMemberWelcomeEmail({
      to: session.user.email,
      name: session.user.name ?? undefined,
      organizationName: org.name,
      licenseCode: assignedCode,
      userId: session.user.id,
      licenseId: seat?.id,
    });
  }

  // Notify owner — alleen als owner ≠ joiner (anders nutteloos)
  if (owner && owner.userId !== session.user.id && org) {
    // Lookup member-naam
    const [memberRow] = await dbAuth
      .select({ name: authUser.name })
      .from(authUser)
      .where(eq(authUser.id, session.user.id))
      .limit(1);
    void sendOrgOwnerMemberJoinedEmail({
      to: owner.email,
      ownerName: owner.name,
      organizationName: org.name,
      memberEmail: session.user.email,
      memberName: memberRow?.name ?? null,
      userId: owner.userId,
    });
  }

  return NextResponse.json({
    success: true,
    organizationId: invite.organizationId,
    licenseCode: assignedCode,
  });
}
