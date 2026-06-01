// Dicteren.ai — Clay → CRM bulk-import (MCP-callable, admin-only).
//
// De GTM-engineer pusht verrijkte lijsten vanuit Clay. Contract:
//   { rows: EnrichedProspectRow[], assignToUserId?, listId?, source? }
// Velden = onze schema-namen; overige Clay-kolommen in row.extra (→ jsonb).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  importEnrichedProspects,
  type EnrichedProspectRow,
} from "@/lib/services/prospectImport";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;

  let body: {
    rows?: EnrichedProspectRow[];
    assignToUserId?: string | null;
    listId?: string | null;
    source?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body ongeldig" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: "Geen rows" }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json(
      { success: false, error: "Max 1000 rows per import" },
      { status: 400 },
    );
  }

  const result = await importEnrichedProspects(rows, {
    actorUserId: guard.session.user.id,
    assignToUserId: body.assignToUserId ?? null,
    listId: body.listId ?? null,
    source: body.source ?? "clay",
  });

  await logEvent({
    action: "admin.action",
    entityType: "crm_import",
    entityId: body.listId ?? "prospects",
    actorId: guard.session.user.id,
    metadata: {
      action: "clay_import",
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      assignedTo: body.assignToUserId ?? null,
      listId: body.listId ?? null,
    },
  });

  return NextResponse.json({ success: true, ...result });
}
