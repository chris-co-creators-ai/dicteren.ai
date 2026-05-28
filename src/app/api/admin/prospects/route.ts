// Dicteren.ai — Prospect-toevoeging (single + bulk).
//
// Schrijft contacts in crm_contacts + auto-find-or-create crm_organizations.
// GEEN auth.user-write — een prospect heeft geen login. Email-format wordt
// hard gevalideerd voor de DB geraakt wordt zodat de Marijke-bug (email
// zonder @ in auth.user) niet meer kan.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  addProspect,
  bulkImportProspects,
  type ProspectInput,
} from "@/lib/services/prospect";
import { logEvent } from "@/lib/services/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    prospect?: ProspectInput;
    prospects?: ProspectInput[];
    listIds?: string[]; // legacy, ignored — lead_lists hangt aan auth.user
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
    });
    await logEvent({
      action: "admin.action",
      entityType: "crm_contact",
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
  const email = body.prospect?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { success: false, error: "email verplicht" },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig e-mailadres." },
      { status: 400 },
    );
  }

  try {
    const result = await addProspect({
      prospect: body.prospect!,
      addedByUserId: session.user.id,
    });
    await logEvent({
      action: "admin.action",
      entityType: "crm_contact",
      entityId: result.contactId,
      actorId: session.user.id,
      metadata: {
        kind: "single_added",
        status: result.status,
        email,
        organizationId: result.organizationId,
      },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Toevoegen mislukt";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 400 },
    );
  }
}
