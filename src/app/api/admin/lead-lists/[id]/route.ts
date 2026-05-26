import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  deleteLeadList,
  updateLeadList,
  type ListColorValue,
} from "@/lib/services/leadList";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;

  let body: {
    name?: string;
    description?: string | null;
    color?: ListColorValue;
    isShared?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const updated = await updateLeadList(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Lijst niet gevonden" },
      { status: 404 },
    );
  }

  await logEvent({
    action: "admin.action",
    entityType: "lead_list",
    entityId: id,
    actorId: session.user.id,
    metadata: { kind: "list_updated", fields: Object.keys(body) },
  });

  return NextResponse.json({ success: true, list: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;
  await deleteLeadList(id);
  await logEvent({
    action: "admin.action",
    entityType: "lead_list",
    entityId: id,
    actorId: session.user.id,
    metadata: { kind: "list_deleted" },
  });
  return NextResponse.json({ success: true });
}
