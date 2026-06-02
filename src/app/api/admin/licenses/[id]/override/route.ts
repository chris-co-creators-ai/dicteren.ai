// Dicteren.ai — Admin: licentie-status forceren / geldigheid verlengen (G3).
//
// POST /api/admin/licenses/{id}/override  { setStatus?, extendMonths?, reason? }
//
// Support-actie voor gevallen die de normale flow niet dekt: klant betaalde maar
// staat op expired, coulance-verlenging, of een per ongeluk gerevokede licentie
// terugzetten. Admin + account manager.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { overrideLicense } from "@/lib/services/adminSupport";
import type { License } from "@/lib/db/schema";

type Params = Promise<{ id: string }>;

const ALLOWED: ReadonlyArray<License["status"]> = [
  "active",
  "trial",
  "past_due",
  "canceled",
  "expired",
  "revoked",
];

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id } = await params;

  let body: { setStatus?: string; extendMonths?: number; reason?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.setStatus && !ALLOWED.includes(body.setStatus as License["status"])) {
    return NextResponse.json(
      { success: false, error: "Ongeldige status.", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  const result = await overrideLicense({
    licenseId: id,
    setStatus: body.setStatus as License["status"] | undefined,
    extendMonths:
      typeof body.extendMonths === "number" ? body.extendMonths : undefined,
    actorUserId: session.user.id,
    reason: body.reason,
  });

  if (!result.success) {
    return NextResponse.json(result, {
      status: result.code === "NOT_FOUND" ? 404 : 400,
    });
  }
  return NextResponse.json(result);
}
