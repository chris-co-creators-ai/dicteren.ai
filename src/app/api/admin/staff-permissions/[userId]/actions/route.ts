// Dicteren.ai — Admin: per-user action-permissions PATCH
//
// Voor admin om de actie-toggles per staff-member te wijzigen.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  ACTION_KEYS,
  updatePermissionsFor,
  type ActionKey,
  type ActionPermissions,
} from "@/lib/services/staffActionPermissions";

type Params = Promise<{ userId: string }>;

export async function PATCH(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;
  const { userId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  // Whitelist: alleen bekende action-keys
  const patch: ActionPermissions = {};
  for (const key of ACTION_KEYS) {
    if (key in body) {
      patch[key as ActionKey] = Boolean(body[key]);
    }
  }

  const merged = await updatePermissionsFor({
    userId,
    patch,
    actorUserId: guard.session.user.id,
  });

  return NextResponse.json({ success: true, data: merged });
}
