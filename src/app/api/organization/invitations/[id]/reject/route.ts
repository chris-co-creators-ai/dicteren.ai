// Dicteren.ai — Invitation reject-route
//
// User weigert invite. Releases de seat-reservering en zet invitation
// status op "rejected".

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { authInvitation, authOrg } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/session";
import { logEvent } from "@/lib/services/audit";

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

  const [invite] = await dbAuth
    .select({
      email: authInvitation.email,
      status: authInvitation.status,
      organizationId: authInvitation.organizationId,
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
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: "Deze uitnodiging is voor een ander e-mailadres." },
      { status: 403 },
    );
  }

  await dbAuth
    .update(authInvitation)
    .set({ status: "rejected" })
    .where(eq(authInvitation.id, invitationId));

  // Maak seat weer vrij
  await db
    .update(licenses)
    .set({ invitationId: null, updatedAt: new Date() })
    .where(eq(licenses.invitationId, invitationId));

  const [org] = await dbAuth
    .select({ name: authOrg.name })
    .from(authOrg)
    .where(eq(authOrg.id, invite.organizationId))
    .limit(1);

  await logEvent({
    action: "organization.invitation_canceled",
    entityType: "organization",
    entityId: invite.organizationId,
    actorId: session.user.id,
    metadata: {
      invitationId,
      reason: "rejected_by_invitee",
      orgName: org?.name,
    },
  });

  return NextResponse.json({ success: true });
}
