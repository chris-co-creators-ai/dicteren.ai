// Dicteren.ai — Admin: zakelijke prijs-config bewerken
//
// Admin-only. Bewerkt de globale staffel + periode-premies (pricing_tiers +
// pricing_settings). Per-klant maatwerk doet de AM op de CRM-deal, niet hier.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getPricing,
  savePricing,
  validatePricingInput,
  type PricingSaveInput,
} from "@/lib/services/pricing";
import { logEvent } from "@/lib/services/audit";

export async function GET() {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;
  const pricing = await getPricing(true);
  return NextResponse.json({ success: true, data: pricing });
}

export async function POST(request: Request) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;

  let body: PricingSaveInput;
  try {
    body = (await request.json()) as PricingSaveInput;
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt of is ongeldig" },
      { status: 400 },
    );
  }

  const tiers = Array.isArray(body.tiers)
    ? body.tiers.map((t) => ({
        minSeats: Math.round(Number(t.minSeats)),
        maxSeats:
          t.maxSeats === null || t.maxSeats === undefined
            ? null
            : Math.round(Number(t.maxSeats)),
        pricePerSeatCents: Math.round(Number(t.pricePerSeatCents)),
      }))
    : [];

  const input: PricingSaveInput = {
    tiers,
    quarterlyPremiumPct: Math.round(Number(body.quarterlyPremiumPct)),
    monthlyPremiumPct: Math.round(Number(body.monthlyPremiumPct)),
    customQuoteFrom: Math.round(Number(body.customQuoteFrom)),
    currency: body.currency ?? "EUR",
  };

  const invalid = validatePricingInput(input);
  if (invalid) {
    return NextResponse.json({ success: false, error: invalid }, { status: 400 });
  }

  await savePricing(input);

  await logEvent({
    action: "pricing.updated",
    entityType: "pricing",
    entityId: "global",
    actorId: guard.session.user.id,
    metadata: {
      tiers: input.tiers,
      quarterlyPremiumPct: input.quarterlyPremiumPct,
      monthlyPremiumPct: input.monthlyPremiumPct,
      customQuoteFrom: input.customQuoteFrom,
    },
  });

  const pricing = await getPricing(true);
  return NextResponse.json({ success: true, data: pricing });
}
