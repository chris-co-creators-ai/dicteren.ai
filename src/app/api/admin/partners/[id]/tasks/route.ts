// Dicteren.ai — Partner-tasks: GET (lijst) + POST (create) per partner-org.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  createPartnerTask,
  listTasksByPartner,
  type PartnerTaskKind,
} from "@/lib/services/partnerTasks";

const VALID_KINDS: PartnerTaskKind[] = [
  "email",
  "phone",
  "demo",
  "visit",
  "follow_up",
  "other",
];

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await ctx.params;
  const tasks = await listTasksByPartner(id);
  return NextResponse.json({ success: true, tasks });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await ctx.params;

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

  const kindRaw = String(body.kind ?? "other");
  const kind = (VALID_KINDS as string[]).includes(kindRaw)
    ? (kindRaw as PartnerTaskKind)
    : "other";

  const dueRaw = body.dueDate;
  let dueDate: Date | null = null;
  if (typeof dueRaw === "string" && dueRaw) {
    const d = new Date(dueRaw);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  const row = await createPartnerTask({
    partnerOrgId: id,
    title,
    kind,
    dueDate,
    notes: typeof body.notes === "string" ? body.notes : null,
    createdByUserId: session.user.id,
  });

  return NextResponse.json({ success: true, task: row });
}
