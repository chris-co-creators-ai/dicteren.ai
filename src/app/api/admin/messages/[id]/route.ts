import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  updateContactMessage,
  type ContactMessageStatus,
} from "@/lib/services/contactMessage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }
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
