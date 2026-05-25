// Dicteren.ai — Prospect-toevoeging (single + bulk).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  addProspect,
  bulkImportProspects,
  type ProspectInput,
} from "@/lib/services/prospect";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }

  let body: {
    prospect?: ProspectInput;
    prospects?: ProspectInput[];
    listIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  // Bulk-import-pad
  if (Array.isArray(body.prospects)) {
    const result = await bulkImportProspects({
      prospects: body.prospects,
      addedByUserId: session.user.id,
      listIds: body.listIds,
    });
    await logEvent({
      action: "admin.action",
      entityType: "prospect_import",
      entityId: session.user.id,
      actorId: session.user.id,
      metadata: {
        kind: "bulk_import",
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        total: result.total,
      },
    });
    return NextResponse.json({ success: true, result });
  }

  // Single-pad
  if (!body.prospect?.email?.trim()) {
    return NextResponse.json(
      { success: false, error: "email verplicht" },
      { status: 400 },
    );
  }

  const result = await addProspect({
    prospect: body.prospect,
    addedByUserId: session.user.id,
    listIds: body.listIds,
  });
  await logEvent({
    action: "admin.action",
    entityType: "prospect",
    entityId: result.userId,
    actorId: session.user.id,
    metadata: {
      kind: "single_added",
      status: result.status,
      email: body.prospect.email,
    },
  });
  return NextResponse.json({ success: true, ...result });
}
