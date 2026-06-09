import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { deleteTaskAttachment } from "@/lib/services/kanban";

type Params = Promise<{ id: string; attId: string }>;

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { attId } = await params;
  await deleteTaskAttachment(attId, guard.session.user.id);
  return NextResponse.json({ success: true });
}
