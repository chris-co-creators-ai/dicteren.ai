// Dicteren.ai — Publiek: log een bezoek aan de deck-pagina (reseller-funnel).
// Het BEZOEK is de warm-trigger (niet de mail-open, die is onbetrouwbaar).
// Idempotent: alleen het eerste bezoek zet de lead op warm + maakt de AM-taak.

import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { markDeckVisited } from "@/lib/services/partnerFunnel";

type Params = Promise<{ token: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const blocked = await enforceRateLimit(request, "partner:visit");
  if (blocked) return blocked;
  const { token } = await params;
  await markDeckVisited(token);
  return NextResponse.json({ success: true });
}
