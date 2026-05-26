// Dicteren.ai — Update of archiveer één partner-organisatie. Door drag-drop
// in kanban-view + inline-edit in table-view.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { updatePartnerOrg, archivePartnerOrg } from "@/lib/services/partner";

const EDITABLE_FIELDS = [
  "organizationName",
  "priority",
  "segment",
  "organizationType",
  "whyRelevant",
  "decisionMaker",
  "email",
  "phone",
  "city",
  "website",
  "contactUrl",
  "accountOwner",
  "outreachStatus",
  "pilotStatus",
  "lastContactDate",
  "nextAction",
  "followUpDate",
  "responseSummary",
  "freeCodesCount",
  "gdprNotes",
] as const;

export async function PATCH(
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

  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE_FIELDS) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { success: false, error: "Geen velden om bij te werken" },
      { status: 400 },
    );
  }

  const row = await updatePartnerOrg(id, patch, session.user.id);
  if (!row) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, partner: row });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;
  const { session } = guard;

  const { id } = await ctx.params;
  const row = await archivePartnerOrg(id, session.user.id);
  if (!row) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}
