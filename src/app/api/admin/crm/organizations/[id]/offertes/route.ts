// Dicteren.ai — Admin: offertes per CRM-organisatie (lijst + aanmaken)
//
// Staff-gated (admin + account_manager), zelfde gedeelde-pijplijn-regel als de
// rest van het CRM. Totalen worden server-side herberekend in createOfferte —
// de client levert alleen de regels.

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import { createOfferte, listOffertesForOrg } from "@/lib/services/offerte";
import type {
  OfferteLineItem,
  OffertePeriod,
  OfferteTemplateKey,
} from "@/lib/services/offerteShared";

type Params = Promise<{ id: string }>;

const PERIODS: OffertePeriod[] = ["monthly", "quarterly", "yearly"];
const TEMPLATES: OfferteTemplateKey[] = ["minimalist", "klassiek", "merk"];

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { id } = await params;
  const rows = await listOffertesForOrg(id);
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const period = (PERIODS as string[]).includes(String(body.period))
    ? (body.period as OffertePeriod)
    : "yearly";
  const templateKey = (TEMPLATES as string[]).includes(String(body.templateKey))
    ? (body.templateKey as OfferteTemplateKey)
    : "merk";
  const lineItems = Array.isArray(body.lineItems)
    ? (body.lineItems as OfferteLineItem[])
    : [];

  const result = await createOfferte({
    orgId: id,
    seats: Number(body.seats) || 1,
    period,
    templateKey,
    lineItems,
    validUntil: (body.validUntil as string | null) ?? null,
    introText: (body.introText as string | null) ?? null,
    closingText: (body.closingText as string | null) ?? null,
    notes: (body.notes as string | null) ?? null,
    actorUserId: guard.session.user.id,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
