// Dicteren.ai — Admin-only: per-user page-blocks instellen.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { setStaffBlocks } from "@/lib/services/staffPermissions";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { userId } = await params;

  let body: { blockedPaths?: string[]; notes?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.blockedPaths)) {
    return NextResponse.json(
      { success: false, error: "blockedPaths[] verplicht" },
      { status: 400 },
    );
  }

  await setStaffBlocks({
    userId,
    blockedPaths: body.blockedPaths,
    notes: body.notes ?? null,
    updatedByUserId: session.user.id,
  });
  await logEvent({
    action: "admin.action",
    entityType: "user",
    entityId: userId,
    actorId: session.user.id,
    metadata: {
      kind: "staff_permissions_updated",
      blockedPaths: body.blockedPaths,
    },
  });

  return NextResponse.json({ success: true });
}
