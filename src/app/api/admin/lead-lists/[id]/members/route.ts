import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  addMembersToList,
  removeMembersFromList,
} from "@/lib/services/leadList";

export async function POST(
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

  let body: { userIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "userIds[] verplicht" },
      { status: 400 },
    );
  }

  const added = await addMembersToList({
    listId: id,
    userIds: body.userIds,
    addedByUserId: session.user.id,
  });

  return NextResponse.json({ success: true, added });
}

export async function DELETE(
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

  let body: { userIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "userIds[] verplicht" },
      { status: 400 },
    );
  }

  await removeMembersFromList({
    listId: id,
    userIds: body.userIds,
  });

  return NextResponse.json({ success: true });
}
