// Dicteren.ai — Seat intrekken (revoke)
//
// Owner trekt een toegewezen seat in. Member raakt direct toegang kwijt,
// devices worden gedeactiveerd. Subscription-amount blijft tot de owner
// ook een downgrade doet (aparte actie).

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/services";
import { revokeSeat } from "@/lib/services/orgSeats";
import { enforceRateLimit } from "@/lib/services/rateLimit";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; seatId: string }>;

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const { id: orgId, seatId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const blocked = await enforceRateLimit(request, "org:seat_revoke", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  const membership = await getMembership({
    userId: session.user.id,
    organizationId: orgId,
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { success: false, error: "Alleen beheerders mogen seats intrekken." },
      { status: 403 },
    );
  }

  // Verify seat behoort tot deze org
  const [seat] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, seatId))
    .limit(1);
  if (!seat || seat.organizationId !== orgId || seat.type !== "team") {
    return NextResponse.json(
      { success: false, error: "Seat niet gevonden." },
      { status: 404 },
    );
  }

  const result = await revokeSeat({
    licenseId: seatId,
    actorUserId: session.user.id,
    reason: "owner_action",
  });

  return NextResponse.json({
    success: true,
    revokedDevices: result.revokedDevices,
    previousUserId: result.previousUserId,
  });
}
