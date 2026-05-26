// Dicteren.ai — Admin: commission status mutation (payable / paid / voided).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { updateCommissionStatus } from "@/lib/services/affiliate";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; commissionId: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id: affiliateId, commissionId } = await params;

  let body: {
    status?: "pending" | "payable" | "paid" | "voided";
    paidReference?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.status) {
    return NextResponse.json(
      { success: false, error: "status verplicht" },
      { status: 400 },
    );
  }

  await updateCommissionStatus({
    commissionId,
    status: body.status,
    paidReference: body.paidReference ?? null,
  });
  await logEvent({
    action: "affiliate.commission_status_changed",
    entityType: "affiliate",
    entityId: affiliateId,
    actorId: session.user.id,
    metadata: { commissionId, status: body.status },
  });

  return NextResponse.json({ success: true });
}
