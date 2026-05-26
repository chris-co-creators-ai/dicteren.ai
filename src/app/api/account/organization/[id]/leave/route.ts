// Dicteren.ai — Member verlaat organisatie zelf
//
// Member kiest 'Verlaat organisatie'. Owner kan dit NIET via deze route —
// die moet eerst ownership transferen of de org sluiten.

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { authMember } from "@/lib/db/auth-schema";
import { licenses } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getMembership, getOrgInfo, getOrgOwner } from "@/lib/services";
import { revokeAllActivationsForMember } from "@/lib/services/orgSeats";
import { logEvent } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const { id: orgId } = await params;

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
  if (!membership) {
    return NextResponse.json(
      { success: false, error: "Je bent geen lid van deze organisatie." },
      { status: 404 },
    );
  }
  if (membership.role === "owner") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Je bent eigenaar van deze organisatie. Draag eerst het eigenaarschap over of zeg het hele abonnement op.",
        code: "OWNER_CANNOT_LEAVE",
      },
      { status: 400 },
    );
  }

  // Revoke alle devices op org-team-licenses voor deze user
  await revokeAllActivationsForMember({
    orgId,
    userId: session.user.id,
    actorUserId: session.user.id,
    reason: "member_left",
  });

  // Maak seats weer vrij (status blijft active, userId=null)
  await db
    .update(licenses)
    .set({
      userId: null,
      assignedAt: null,
      status: "unassigned",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(licenses.organizationId, orgId),
        eq(licenses.userId, session.user.id),
        eq(licenses.type, "team"),
      ),
    );

  // Verwijder member-row
  await dbAuth
    .delete(authMember)
    .where(
      and(
        eq(authMember.userId, session.user.id),
        eq(authMember.organizationId, orgId),
      ),
    );

  const owner = await getOrgOwner(orgId);
  const org = await getOrgInfo(orgId);

  await logEvent({
    action: "organization.member_left",
    entityType: "organization",
    entityId: orgId,
    actorId: session.user.id,
    metadata: {
      userId: session.user.id,
      orgName: org?.name,
      ownerEmail: owner?.email,
    },
  });

  return NextResponse.json({ success: true });
}
