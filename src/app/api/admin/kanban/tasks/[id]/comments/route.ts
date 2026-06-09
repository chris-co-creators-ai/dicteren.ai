import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listTaskComments, addTaskComment } from "@/lib/services/kanban";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const comments = await listTaskComments(id);
  return NextResponse.json({ success: true, comments });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const text = (body.body as string | undefined)?.trim();
  if (!text) {
    return NextResponse.json(
      { success: false, error: "Comment mag niet leeg zijn" },
      { status: 400 },
    );
  }
  const mentions = Array.isArray(body.mentions)
    ? (body.mentions as string[])
    : undefined;
  const comment = await addTaskComment({
    taskId: id,
    body: text,
    authorUserId: guard.session.user.id,
    mentions,
  });
  return NextResponse.json({ success: true, comment });
}
