// Dicteren.ai — Admin: zet/wis een afspraak-vinkje (partner-funnel, stage "Afspraak rond").
// Commissie / 15%-korting / verwachte klanten. Bij compleet → AM-taak "controleer brand identity".

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  setAfspraakMarker,
  type AfspraakMarker,
} from "@/lib/services/partnerFunnel";

type Params = Promise<{ contactId: string }>;

const VALID: AfspraakMarker[] = ["commission", "discount", "expected_clients"];

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { contactId } = await params;

  let body: { marker?: string; value?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.marker || !VALID.includes(body.marker as AfspraakMarker)) {
    return NextResponse.json(
      { success: false, error: "Onbekende marker" },
      { status: 400 },
    );
  }

  await setAfspraakMarker(
    contactId,
    body.marker as AfspraakMarker,
    body.value !== false,
  );
  return NextResponse.json({ success: true });
}
