// Dicteren.ai — Admin: CRM organisatie task (complete + delete)

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  completeCrmOrgTask,
  deleteCrmOrgTask,
  setCrmOrgTaskDueDate,
} from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty body = mark done
  }

  if (body.status === "done" || body.completed === true) {
    const done = await completeCrmOrgTask(id, session.user.id);
    if (!done) {
      return NextResponse.json(
        { success: false, error: "Niet gevonden of al klaar" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: done });
  }

  if (typeof body.dueAt === "string" && body.dueAt) {
    const due = new Date(body.dueAt);
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json(
        { success: false, error: "Ongeldige datum" },
        { status: 400 },
      );
    }
    const updated = await setCrmOrgTaskDueDate(id, due);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Niet gevonden of al klaar" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json(
    { success: false, error: "Geen geldige actie" },
    { status: 400 },
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const ok = await deleteCrmOrgTask(id);
  return NextResponse.json({ success: ok });
}
