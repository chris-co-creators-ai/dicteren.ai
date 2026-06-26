import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  createLeadList,
  type ListColorValue,
} from "@/lib/services/leadList";
import { canPerform } from "@/lib/services/staffActionPermissions";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  const allowed = await canPerform({
    userId: session.user.id,
    role: session.user.role ?? null,
    action: "crm_list.create",
  });
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Je hebt geen rechten om CRM-lijsten aan te maken. Vraag Christian om dit recht aan te zetten." },
      { status: 403 },
    );
  }

  let body: {
    name?: string;
    description?: string | null;
    color?: ListColorValue;
    listType?: "eindklant" | "reseller";
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
    listType: body.listType === "reseller" ? "reseller" : "eindklant",
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
