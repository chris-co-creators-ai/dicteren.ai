import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listBoards, createBoard } from "@/lib/services/kanban";

export async function GET() {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const boards = await listBoards(guard.session.user.id);
  return NextResponse.json({ success: true, boards });
}

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const body = await request.json().catch(() => ({}));
  const name = (body.name as string | undefined)?.trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Naam is verplicht" },
      { status: 400 },
    );
  }
  const visibility = body.visibility === "private" ? "private" : "shared";
  const board = await createBoard({
    name,
    description: (body.description as string | undefined)?.trim() || null,
    visibility,
    color: (body.color as string | undefined) || null,
    ownerUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, board });
}
