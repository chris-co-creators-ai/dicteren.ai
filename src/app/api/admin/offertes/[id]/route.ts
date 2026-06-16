// Dicteren.ai — Admin: één offerte (ophalen + status bijwerken)

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import { getOfferte, updateOfferteStatus } from "@/lib/services/offerte";
import {
  OFFERTE_STATUSES,
  type OfferteStatus,
} from "@/lib/services/offerteShared";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { id } = await params;
  const offerte = await getOfferte(id);
  if (!offerte) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: offerte });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
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

  const status = String(body.status);
  if (!(OFFERTE_STATUSES as string[]).includes(status)) {
    return NextResponse.json(
      { success: false, error: "Ongeldige status" },
      { status: 400 },
    );
  }

  const result = await updateOfferteStatus(
    id,
    status as OfferteStatus,
    guard.session.user.id,
  );
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
