// Dicteren.ai — Wijs een hele lead-lijst toe aan een AM (admin-only).
//   { assignToUserId: string | null }

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { assignLeadList } from "@/lib/services/crmAssign";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;
  const { id } = await params;

  let body: { assignToUserId?: string | null };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await assignLeadList({
    listId: id,
    assignToUserId: body.assignToUserId ?? null,
    actorUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, ...result });
}
