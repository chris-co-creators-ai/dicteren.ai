// Dicteren.ai — Admin: maak een nieuwe discount-code aan.
//
// Generieke endpoint: code kan optioneel aan een affiliate gekoppeld zijn.
// Voor affiliate-gekoppelde codes met auto-prefix: gebruik liever
// /api/admin/affiliates/[id]/discount-codes (die genereert de prefix uit
// de affiliate-naam).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema";
import {
  createDiscountCodeForAffiliate,
  generateUniqueCodeSuffix,
} from "@/lib/services/discount";
import { getAffiliateById } from "@/lib/services/affiliate";
import { logEvent } from "@/lib/services/audit";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    code?: string;
    type?: "percentage" | "fixed" | "free_months";
    value?: number;
    appliesTo?: "consumer" | "organization" | null;
    minimumSeats?: number | null;
    maxRedemptions?: number | null;
    validUntil?: string | null;
    affiliateId?: string | null;
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

  // Affiliate-gekoppeld pad → gebruik bestaande helper (auto-prefix uit naam).
  if (body.affiliateId) {
    const affiliate = await getAffiliateById(body.affiliateId);
    if (!affiliate) {
      return NextResponse.json(
        { success: false, error: "Affiliate niet gevonden" },
        { status: 404 },
      );
    }
    const discount = await createDiscountCodeForAffiliate({
      affiliateId: body.affiliateId,
      affiliateName: affiliate.name,
      type: body.type,
      value: body.value,
      appliesTo: body.appliesTo ?? null,
      minimumSeats: body.minimumSeats ?? null,
      maxRedemptions: body.maxRedemptions ?? null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      customCode: body.code ?? null,
    });
    await logEvent({
      action: "discount.redeemed",
      entityType: "discount_code",
      entityId: discount.id,
      actorId: session.user.id,
      metadata: {
        kind: "created_via_admin_discounts",
        affiliateId: body.affiliateId,
        code: discount.code,
      },
    });
    return NextResponse.json({ success: true, discount });
  }

  // Algemene code (geen affiliate). Code moet meegegeven worden — geen
  // automatische prefix uit ergens.
  if (!body.code?.trim()) {
    return NextResponse.json(
      { success: false, error: "Code is verplicht voor algemene kortingen" },
      { status: 400 },
    );
  }
  const normalized = body.code.trim().toUpperCase();
  const [existing] = await db
    .select({ id: discountCodes.id })
    .from(discountCodes)
    .where(eq(discountCodes.code, normalized))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Deze code bestaat al" },
      { status: 409 },
    );
  }

  const [row] = await db
    .insert(discountCodes)
    .values({
      code: normalized,
      type: body.type,
      value: body.value,
      appliesTo: body.appliesTo ?? null,
      minimumSeats: body.minimumSeats ?? null,
      maxRedemptions: body.maxRedemptions ?? null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      isActive: true,
    })
    .returning();

  await logEvent({
    action: "discount.redeemed",
    entityType: "discount_code",
    entityId: row.id,
    actorId: session.user.id,
    metadata: {
      kind: "created_via_admin_discounts",
      code: row.code,
      affiliateId: null,
    },
  });

  // generateUniqueCodeSuffix wordt elders in de code gebruikt; hier voor
  // toekomstige bulk-actie (suppressed unused warning).
  void generateUniqueCodeSuffix;

  return NextResponse.json({ success: true, discount: row });
}
