// Dicteren.ai — Admin: apparaat-activatie deactiveren (G1).
//
// POST /api/admin/activations/{id}/deactivate  { reason? }
//
// De meest voorkomende supportvraag: klant zit vast op het maximum aantal
// apparaten (oude laptop kapot/verkocht). Admin/AM zet een activatie uit zodat
// er weer een slot vrijkomt. Hergebruikt revokeActivation uit orgSeats.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { revokeActivation } from "@/lib/services/orgSeats";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id } = await params;

  let reason = "admin_support";
  try {
    const body = (await request.json()) as { reason?: string };
    if (body.reason?.trim()) reason = body.reason.trim();
  } catch {
    // lege body is prima
  }

  const result = await revokeActivation({
    activationId: id,
    actorUserId: session.user.id,
    reason,
  });

  if (!result.licenseId) {
    return NextResponse.json(
      { success: false, error: "Activatie niet gevonden." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    licenseId: result.licenseId,
    memberUserId: result.memberUserId,
  });
}
