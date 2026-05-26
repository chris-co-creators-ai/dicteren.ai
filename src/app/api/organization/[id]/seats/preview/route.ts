// Dicteren.ai — Seat-change preview
//
// Owner krijgt vóór bevestigen een quote: pro-rata, tier-overgang, totaal.
// Idempotent (zuiver read), maar gewikkeld als POST omdat we de body
// (`newSeats`) als request-payload willen.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import { previewSeatChange } from "@/lib/services/orderUpgrade";
import { enforceRateLimit } from "@/lib/services/rateLimit";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const { id: orgId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const blocked = await enforceRateLimit(request, "org:seat_preview", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  const membership = await getMembership({
    userId: session.user.id,
    organizationId: orgId,
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { success: false, error: "Alleen beheerders mogen seats wijzigen." },
      { status: 403 },
    );
  }

  let body: { newSeats?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt." },
      { status: 400 },
    );
  }

  const newSeats = Math.floor(Number(body.newSeats ?? 0));
  if (!Number.isFinite(newSeats) || newSeats < 1) {
    return NextResponse.json(
      { success: false, error: "Aantal seats moet minimaal 1 zijn." },
      { status: 400 },
    );
  }

  const quote = await previewSeatChange({ orgId, newSeats });
  return NextResponse.json({ success: true, quote });
}
