// Dicteren.ai — Admin: maak een discount-code aan die aan een affiliate
// gekoppeld is. Bij gebruik krijgt de klant korting EN wordt de affiliate
// geattribueerd (lifetime).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAffiliateById } from "@/lib/services/affiliate";
import { createDiscountCodeForAffiliate } from "@/lib/services/discount";
import { logEvent } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }
  const { id: affiliateId } = await params;

  const affiliate = await getAffiliateById(affiliateId);
  if (!affiliate) {
    return NextResponse.json(
      { success: false, error: "Affiliate niet gevonden" },
      { status: 404 },
    );
  }

  let body: {
    type?: "percentage" | "fixed" | "free_months";
    value?: number;
    appliesTo?: "consumer" | "organization" | null;
    minimumSeats?: number | null;
    maxRedemptions?: number | null;
    validUntil?: string | null;
    customCode?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.type || typeof body.value !== "number") {
    return NextResponse.json(
      { success: false, error: "type en value verplicht" },
      { status: 400 },
    );
  }

  const discount = await createDiscountCodeForAffiliate({
    affiliateId,
    affiliateName: affiliate.name,
    type: body.type,
    value: body.value,
    appliesTo: body.appliesTo ?? null,
    minimumSeats: body.minimumSeats ?? null,
    maxRedemptions: body.maxRedemptions ?? null,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    customCode: body.customCode ?? null,
  });

  await logEvent({
    action: "discount.redeemed", // hergebruik bestaand action (we hebben geen "discount.created")
    entityType: "discount_code",
    entityId: discount.id,
    actorId: session.user.id,
    metadata: {
      kind: "created_for_affiliate",
      affiliateId,
      code: discount.code,
      type: discount.type,
      value: discount.value,
    },
  });

  return NextResponse.json({ success: true, discount });
}
