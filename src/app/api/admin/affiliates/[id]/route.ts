// Dicteren.ai — Admin affiliate update endpoint.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  updateAffiliate,
  type AffiliateStatusValue,
  type CommissionType,
} from "@/lib/services/affiliate";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;

  let body: {
    name?: string;
    contactEmail?: string;
    contactPhone?: string | null;
    status?: AffiliateStatusValue;
    commissionType?: CommissionType;
    commissionPct?: number;
    commissionFixedCents?: number;
    payoutMethod?: string | null;
    payoutDetails?: Record<string, unknown> | null;
    internalNotes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const updated = await updateAffiliate(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Affiliate niet gevonden" },
      { status: 404 },
    );
  }

  await logEvent({
    action: "affiliate.updated",
    entityType: "affiliate",
    entityId: id,
    actorId: session.user.id,
    metadata: { fields: Object.keys(body) },
  });

  return NextResponse.json({ success: true, affiliate: updated });
}
