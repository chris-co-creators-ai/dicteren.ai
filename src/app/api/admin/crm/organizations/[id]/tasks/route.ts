// Dicteren.ai — Admin: CRM organisatie tasks (lijst + aanmaken)

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  addCrmOrgTask,
  listTasksForOrg,
} from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const tasks = await listTasksForOrg(id);
  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { success: false, error: "Titel is verplicht" },
      { status: 400 },
    );
  }

  const dueAtRaw = body.dueAt as string | undefined;
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return NextResponse.json(
      { success: false, error: "Ongeldige datum" },
      { status: 400 },
    );
  }

  // Controlled vocabulary: zelfde set als de Taken-tab-selector.
  const TASK_KINDS = new Set(["follow_up", "email", "phone", "demo", "other"]);
  const kindRaw = String(body.kind ?? "other");
  const kind = TASK_KINDS.has(kindRaw) ? kindRaw : "other";

  const created = await addCrmOrgTask({
    actorUserId: session.user.id,
    data: {
      crmOrganizationId: orgId,
      title,
      kind,
      dueAt,
      createdByUserId: session.user.id,
      notes: (body.notes as string | null) ?? null,
    },
  });

  return NextResponse.json({ success: true, data: created });
}
