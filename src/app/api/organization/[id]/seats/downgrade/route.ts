// Dicteren.ai — Seat-verlaging (self-service)
//
// Owner kiest specifieke seats om in te trekken. Geen instant refund —
// betaalde periode loopt door tot nextBillingAt, daarna lager bedrag.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import { executeSeatReduction } from "@/lib/services/orderUpgrade";
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

  const blocked = await enforceRateLimit(request, "org:seat_downgrade", {
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

  let body: { seatIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt." },
      { status: 400 },
    );
  }

  const seatIds = Array.isArray(body.seatIds)
    ? body.seatIds.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
  if (seatIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "Kies welke seats verwijderd worden." },
      { status: 400 },
    );
  }

  const result = await executeSeatReduction({
    orgId,
    seatIdsToRevoke: seatIds,
    actorUserId: session.user.id,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
