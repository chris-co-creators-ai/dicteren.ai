import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { validateDiscountCode } from "@/lib/services/discount";
import { getPlanBySlug, periodToMonths } from "@/lib/services/order";

// Live kortingscode-validatie voor de eigen checkout-stap. Geeft het nieuwe
// bedrag terug zodat de UI de korting direct kan tonen, vóór afrekenen. De
// korting wordt bij het echte afrekenen opnieuw gevalideerd in de checkout-
// route — dit endpoint is alleen voor feedback, niet de bron van waarheid.
export async function POST(request: Request) {
  const blocked = await enforceRateLimit(request, "checkout:validate-discount");
  if (blocked) return blocked;

  let body: { code?: string; planSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const code = body.code?.trim();
  const planSlug = body.planSlug;
  if (!code || !planSlug) {
    return NextResponse.json(
      { valid: false, error: "Code en plan zijn vereist" },
      { status: 400 },
    );
  }

  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.customerType !== "consumer" || !plan.isActive) {
    return NextResponse.json(
      { valid: false, error: "Plan niet beschikbaar" },
      { status: 400 },
    );
  }

  const result = await validateDiscountCode({
    code,
    basisAmountCents: plan.priceCents,
    planId: plan.id,
    seats: 1,
    audience: "consumer",
    periodMonths: periodToMonths(plan.period),
  });

  if (!result.success) {
    return NextResponse.json({
      valid: false,
      error: result.error,
      code: result.code,
    });
  }

  return NextResponse.json({
    valid: true,
    listAmountCents: plan.priceCents,
    payableAmountCents: result.payableAmountCents,
    discountAmountCents: result.discountAmountCents,
  });
}
