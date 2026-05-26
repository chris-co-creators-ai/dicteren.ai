// Dicteren.ai — Admin: discount-code activeren/deactiveren.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { setDiscountCodeActive } from "@/lib/services/discount";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;

  let body: { isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { success: false, error: "isActive verplicht" },
      { status: 400 },
    );
  }

  await setDiscountCodeActive(id, body.isActive);
  await logEvent({
    action: "discount.redeemed",
    entityType: "discount_code",
    entityId: id,
    actorId: session.user.id,
    metadata: { kind: "status_changed", isActive: body.isActive },
  });

  return NextResponse.json({ success: true });
}
