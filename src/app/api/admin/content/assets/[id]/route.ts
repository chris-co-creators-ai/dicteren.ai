import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { archiveAsset, deleteAsset } from "@/lib/services/content";

type Params = Promise<{ id: string }>;

// PATCH = archiveren (zacht). DELETE = hard verwijderen incl. het R2-object.
export async function PATCH(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  await archiveAsset(id, guard.session.user.id);
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const { id } = await params;
  await deleteAsset(id, guard.session.user.id);
  return NextResponse.json({ success: true });
}
