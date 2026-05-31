import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { reorderSteps } from "@/lib/services/leadListSteps";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const isAdmin = session.user.role === "admin";
  const { id } = await params;

  let body: { orderedIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.orderedIds) ||
    !body.orderedIds.every((value) => typeof value === "string")
  ) {
    return NextResponse.json(
      { success: false, error: "orderedIds moet een lijst van ids zijn" },
      { status: 400 },
    );
  }
  const orderedIds = body.orderedIds as string[];

  try {
    await reorderSteps({
      listId: id,
      orderedIds,
      actorUserId: session.user.id,
      isAdmin,
    });

    await logEvent({
      action: "admin.action",
      entityType: "lead_list",
      entityId: id,
      actorId: session.user.id,
      metadata: { kind: "cadence_steps_reordered", count: orderedIds.length },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    if (message === "forbidden") {
      return NextResponse.json(
        { success: false, error: "Geen rechten op deze lijst" },
        { status: 403 },
      );
    }
    if (message === "not_found") {
      return NextResponse.json(
        { success: false, error: "Lijst niet gevonden" },
        { status: 404 },
      );
    }
    throw error;
  }
}
