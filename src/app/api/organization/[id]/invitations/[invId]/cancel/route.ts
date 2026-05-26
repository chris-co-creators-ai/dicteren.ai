// Dicteren.ai — Owner cancelt een pending invite
//
// Annuleert de Better Auth invitation + maakt de gekoppelde seat-reservering
// weer vrij. Geen email — de uitgenodigde krijgt niets te zien.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { authInvitation } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import { logEvent } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; invId: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const { id: orgId, invId: invitationId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const membership = await getMembership({
    userId: session.user.id,
    organizationId: orgId,
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { success: false, error: "Alleen beheerders mogen invites annuleren." },
      { status: 403 },
    );
  }

  const [invite] = await dbAuth
    .select({
      id: authInvitation.id,
      organizationId: authInvitation.organizationId,
      email: authInvitation.email,
      status: authInvitation.status,
    })
    .from(authInvitation)
    .where(eq(authInvitation.id, invitationId))
    .limit(1);
  if (!invite || invite.organizationId !== orgId) {
    return NextResponse.json(
      { success: false, error: "Invite niet gevonden." },
      { status: 404 },
    );
  }
  if (invite.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "Invite is al niet meer pending." },
      { status: 410 },
    );
  }

  await dbAuth
    .update(authInvitation)
    .set({ status: "canceled" })
    .where(eq(authInvitation.id, invitationId));

  // Release seat
  await db
    .update(licenses)
    .set({ invitationId: null, updatedAt: new Date() })
    .where(eq(licenses.invitationId, invitationId));

  await logEvent({
    action: "organization.invitation_canceled",
    entityType: "organization",
    entityId: orgId,
    actorId: session.user.id,
    metadata: { invitationId, email: invite.email, by: "owner" },
  });

  return NextResponse.json({ success: true });
}
