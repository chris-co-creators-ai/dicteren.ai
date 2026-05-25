// Dicteren.ai — Admin: commission status mutation (payable / paid / voided).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateCommissionStatus } from "@/lib/services/affiliate";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; commissionId: string }> },
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }
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
