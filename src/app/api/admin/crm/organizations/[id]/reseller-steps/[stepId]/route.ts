// Dicteren.ai — Admin: één reseller-stap bewerken (titel/notitie/positie/
// afvinken) of verwijderen.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  updateResellerStep,
  toggleResellerStep,
  deleteResellerStep,
} from "@/lib/services/resellerFlow";

type Params = Promise<{ id: string; stepId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { stepId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  if (typeof body.done === "boolean") {
    const row = await toggleResellerStep({
      stepId,
      done: body.done,
      actorUserId: session.user.id,
    });
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Stap niet gevonden" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: row });
  }

  const patch: { title?: string; notes?: string | null; position?: number } =
    {};
  if (typeof body.title === "string" && body.title.trim()) {
    patch.title = body.title.trim();
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes);
  }
  if (typeof body.position === "number" && Number.isInteger(body.position)) {
    patch.position = body.position;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { success: false, error: "Geen geldige wijziging" },
      { status: 400 },
    );
  }
  const row = await updateResellerStep({ stepId, patch });
  if (!row) {
    return NextResponse.json(
      { success: false, error: "Stap niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { stepId } = await params;
  const ok = await deleteResellerStep(stepId);
  return NextResponse.json({ success: ok });
}
