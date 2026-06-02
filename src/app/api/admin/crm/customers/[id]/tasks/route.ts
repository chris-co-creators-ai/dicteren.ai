// Dicteren.ai — Admin: klant-taken (lijst + aanmaken). Polymorfe crm_org_tasks
// via auth_user_id. Complete/delete gaat via /api/admin/crm/tasks/[id].

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { addCrmOrgTask, listTasksForCustomer } from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const tasks = await listTasksForCustomer(id);
  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: userId } = await params;

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
  const created = await addCrmOrgTask({
    actorUserId: session.user.id,
    data: {
      authUserId: userId,
      title,
      kind: (body.kind as string) ?? "other",
      dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
      createdByUserId: session.user.id,
      notes: (body.notes as string | null) ?? null,
    },
  });

  return NextResponse.json({ success: true, data: created });
}
