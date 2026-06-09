import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listSubtasks, createTask } from "@/lib/services/kanban";
import { getBoard } from "@/lib/services/kanban";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const subtasks = await listSubtasks(id);
  return NextResponse.json({ success: true, subtasks });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id: parentTaskId } = await params;
  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  const boardId = body.boardId as string | undefined;
  if (!title || !boardId) {
    return NextResponse.json(
      { success: false, error: "Titel en boardId vereist" },
      { status: 400 },
    );
  }
  void getBoard;
  const task = await createTask({
    boardId,
    parentTaskId,
    title,
    assigneeUserId: body.assigneeUserId ?? null,
    createdByUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, task });
}
