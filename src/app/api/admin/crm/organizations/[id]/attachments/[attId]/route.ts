// Dicteren.ai — Admin: org-bijlage verwijderen (DB-rij + R2-object).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { deleteOrgAttachment } from "@/lib/services/resellerFlow";

type Params = Promise<{ id: string; attId: string }>;

export async function DELETE(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { attId } = await params;
  const ok = await deleteOrgAttachment(attId);
  return NextResponse.json({ success: ok });
}
