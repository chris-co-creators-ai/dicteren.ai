import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  createLeadList,
  type ListColorValue,
} from "@/lib/services/leadList";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

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

  if (!body.name?.trim()) {
    return NextResponse.json(
      { success: false, error: "Naam verplicht" },
      { status: 400 },
    );
  }

  const list = await createLeadList({
    name: body.name,
    description: body.description ?? null,
    color: body.color,
    ownerUserId: session.user.id,
    isShared: body.isShared ?? true,
  });

  await logEvent({
    action: "admin.action",
    entityType: "lead_list",
    entityId: list.id,
    actorId: session.user.id,
    metadata: { kind: "list_created", name: list.name },
  });

  return NextResponse.json({ success: true, list });
}
