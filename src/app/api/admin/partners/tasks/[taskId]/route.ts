// Dicteren.ai — Partner-task: PATCH (status toggle) + DELETE.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  deletePartnerTask,
  markPartnerTaskDone,
  reopenPartnerTask,
} from "@/lib/services/partnerTasks";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { taskId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const status = body.status;
  if (status === "done") {
    const row = await markPartnerTaskDone(taskId, session.user.id);
    if (!row)
      return NextResponse.json(
        { success: false, error: "Niet gevonden" },
        { status: 404 },
      );
    return NextResponse.json({ success: true, task: row });
  }
  if (status === "open") {
    const row = await reopenPartnerTask(taskId, session.user.id);
    if (!row)
      return NextResponse.json(
        { success: false, error: "Niet gevonden" },
        { status: 404 },
      );
    return NextResponse.json({ success: true, task: row });
  }
  return NextResponse.json(
    { success: false, error: "Onbekende status" },
    { status: 400 },
  );
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { taskId } = await ctx.params;
  const ok = await deletePartnerTask(taskId, session.user.id);
  if (!ok)
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  return NextResponse.json({ success: true });
}
