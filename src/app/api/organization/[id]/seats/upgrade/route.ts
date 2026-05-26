// Dicteren.ai — Seat-uitbreiding (self-service)
//
// Owner kiest +N seats. We berekenen pro-rata, charge'n direct, en repleicen
// de Mollie subscription voor de volgende incasso. Delta-seats blijven
// pending_payment tot het webhook-paid event ze activeert.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import { executeSeatExpansion } from "@/lib/services/orderUpgrade";
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

  const blocked = await enforceRateLimit(request, "org:seat_upgrade", {
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

  const result = await executeSeatExpansion({
    orgId,
    newSeats,
    actorUserId: session.user.id,
  });

  if (!result.success) {
    return NextResponse.json(result, {
      status: result.code === "CUSTOM_QUOTE_REQUIRED" ? 400 : 502,
    });
  }

  return NextResponse.json(result);
}
