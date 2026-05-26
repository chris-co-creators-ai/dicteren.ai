// Dicteren.ai — Owner verstuurt invite-mail opnieuw
//
// Bumpt expiresAt naar +48u en stuurt mail met de bijbehorende seat-code.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { authInvitation, authOrg } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import { sendOrganizationInviteEmail } from "@/lib/services/email";
import { logEvent } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { appBase } from "@/lib/url";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; invId: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { id: orgId, invId: invitationId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const blocked = await enforceRateLimit(request, "org:invite_resend", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  const membership = await getMembership({
    userId: session.user.id,
    organizationId: orgId,
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { success: false, error: "Alleen beheerders mogen invites versturen." },
      { status: 403 },
    );
  }

  const [invite] = await dbAuth
    .select()
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
      { success: false, error: "Invite is niet pending." },
      { status: 410 },
    );
  }

  // Bump expiresAt
  const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await dbAuth
    .update(authInvitation)
    .set({ expiresAt: newExpiresAt })
    .where(eq(authInvitation.id, invitationId));

  // Lookup seat-code + org-naam
  const [seat] = await db
    .select({ code: licenses.code })
    .from(licenses)
    .where(eq(licenses.invitationId, invitationId))
    .limit(1);
  const [org] = await dbAuth
    .select({ name: authOrg.name })
    .from(authOrg)
    .where(eq(authOrg.id, orgId))
    .limit(1);

  const inviteUrl = `${appBase()}/auth/accept-invitation/${invitationId}`;
  void sendOrganizationInviteEmail({
    to: invite.email,
    inviterName: session.user.name ?? session.user.email,
    organizationName: org?.name ?? "Dicteren.ai",
    inviteUrl,
    licenseCode: seat?.code,
  });

  await logEvent({
    action: "organization.invitation_resent",
    entityType: "organization",
    entityId: orgId,
    actorId: session.user.id,
    metadata: {
      invitationId,
      email: invite.email,
      newExpiresAt: newExpiresAt.toISOString(),
    },
  });

  return NextResponse.json({ success: true });
}
