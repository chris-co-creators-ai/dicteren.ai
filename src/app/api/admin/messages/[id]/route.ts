import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  updateContactMessage,
  type ContactMessageStatus,
} from "@/lib/services/contactMessage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  let body: {
    status?: ContactMessageStatus;
    assignedToUserId?: string | null;
    adminNotes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const updated = await updateContactMessage(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, message: updated });
}
