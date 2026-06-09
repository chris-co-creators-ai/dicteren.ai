import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getBoard,
  listBoardColumns,
  listBoardTasks,
  updateBoard,
  archiveBoard,
} from "@/lib/services/kanban";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.archivedAt) {
    return NextResponse.json(
      { success: false, error: "Bord niet gevonden" },
      { status: 404 },
    );
  }
  const [columns, tasks] = await Promise.all([
    listBoardColumns(id),
    listBoardTasks(id),
  ]);
  return NextResponse.json({ success: true, board, columns, tasks });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.op === "archive") {
    await archiveBoard(id, guard.session.user.id);
    return NextResponse.json({ success: true });
  }

  const board = await updateBoard(
    id,
    {
      name: body.name?.trim(),
      description:
        body.description !== undefined ? body.description?.trim() || null : undefined,
      visibility: body.visibility,
      color: body.color,
    },
    guard.session.user.id,
  );
  return NextResponse.json({ success: true, board });
}
