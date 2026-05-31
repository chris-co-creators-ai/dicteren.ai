import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  addMembersToList,
  removeMembersFromList,
} from "@/lib/services/leadList";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;

  let body: { userIds?: string[]; crmContactIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds : [];
  const crmContactIds = Array.isArray(body.crmContactIds)
    ? body.crmContactIds
    : [];
  if (userIds.length === 0 && crmContactIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "userIds[] of crmContactIds[] verplicht" },
      { status: 400 },
    );
  }

  const added = await addMembersToList({
    listId: id,
    userIds,
    crmContactIds,
    addedByUserId: session.user.id,
  });

  return NextResponse.json({ success: true, added });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;

  let body: { userIds?: string[]; crmContactIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds : [];
  const crmContactIds = Array.isArray(body.crmContactIds)
    ? body.crmContactIds
    : [];
  if (userIds.length === 0 && crmContactIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "userIds[] of crmContactIds[] verplicht" },
      { status: 400 },
    );
  }

  await removeMembersFromList({
    listId: id,
    userIds,
    crmContactIds,
  });

  return NextResponse.json({ success: true });
}
