import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  deleteCustomColumn,
  updateCustomColumn,
} from "@/lib/services/customColumns";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  let body: {
    name?: string;
    options?: string[] | null;
    position?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const updated = await updateCustomColumn(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, column: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  await deleteCustomColumn(id);
  return NextResponse.json({ success: true });
}
