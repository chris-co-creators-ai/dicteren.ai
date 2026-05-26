// Dicteren.ai — Admin affiliate management endpoints.
//
// Auth: admin + account_manager (operationeel) via requireStaffApi.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { createAffiliate, type CommissionType } from "@/lib/services/affiliate";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    name?: string;
    contactEmail?: string;
    contactPhone?: string;
    userId?: string;
    commissionType?: CommissionType;
    commissionPct?: number;
    commissionFixedCents?: number;
    payoutMethod?: string;
    payoutDetails?: Record<string, unknown>;
    internalNotes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.name?.trim() || !body.contactEmail?.trim()) {
    return NextResponse.json(
      { success: false, error: "Naam en contact-email zijn verplicht." },
      { status: 400 },
    );
  }

  try {
    const affiliate = await createAffiliate({
      name: body.name.trim(),
      contactEmail: body.contactEmail.trim().toLowerCase(),
      contactPhone: body.contactPhone ?? null,
      userId: body.userId ?? null,
      commissionType: body.commissionType ?? "percentage",
      commissionPct: body.commissionPct,
      commissionFixedCents: body.commissionFixedCents,
      payoutMethod: body.payoutMethod ?? null,
      payoutDetails: body.payoutDetails ?? null,
      internalNotes: body.internalNotes ?? null,
    });

    await logEvent({
      action: "affiliate.created",
      entityType: "affiliate",
      entityId: affiliate.id,
      actorId: session.user.id,
      metadata: {
        code: affiliate.code,
        name: affiliate.name,
        commissionType: affiliate.commissionType,
        commissionPct: affiliate.commissionPct,
        commissionFixedCents: affiliate.commissionFixedCents,
      },
    });

    return NextResponse.json({ success: true, affiliate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Aanmaken mislukt";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
