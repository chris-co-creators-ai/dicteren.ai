import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { createTask } from "@/lib/services/kanban";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id: boardId } = await params;
  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (!title) {
    return NextResponse.json(
      { success: false, error: "Titel is verplicht" },
      { status: 400 },
    );
  }
  const task = await createTask({
    boardId,
    columnId: body.columnId ?? null,
    parentTaskId: body.parentTaskId ?? null,
    title,
    description: (body.description as string | undefined)?.trim() || null,
    assigneeUserId: body.assigneeUserId ?? null,
    priority: body.priority ?? "normal",
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    createdByUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, task });
}
