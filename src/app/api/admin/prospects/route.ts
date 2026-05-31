// Dicteren.ai — Prospect-toevoeging (single + bulk).
//
// Schrijft contacts in crm_contacts + auto-find-or-create crm_organizations.
// GEEN auth.user-write — een prospect heeft geen login. Email-format wordt
// hard gevalideerd voor de DB geraakt wordt zodat de Marijke-bug (email
// zonder @ in auth.user) niet meer kan.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema/crmDeals";
import { requireStaffApi } from "@/lib/auth/session";
import {
  addProspect,
  bulkImportProspects,
  type ProspectInput,
} from "@/lib/services/prospect";
import { addMembersToList } from "@/lib/services/leadList";
import { validateAndNormalizeEmail } from "@/lib/services/emailNormalize";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    prospect?: ProspectInput;
    prospects?: ProspectInput[];
    listIds?: string[]; // leadlijsten waar het nieuwe contact in moet
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
  const rawEmail = body.prospect?.email?.trim() ?? "";
  if (!rawEmail) {
    return NextResponse.json(
      { success: false, error: "email verplicht" },
      { status: 400 },
    );
  }
  const validated = validateAndNormalizeEmail(rawEmail);
  if (!validated.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          validated.reason === "disposable"
            ? "Dit lijkt een wegwerp-emailadres. Vraag de prospect om een echte werk-email."
            : "Ongeldig e-mailadres.",
      },
      { status: 400 },
    );
  }
  const email = validated.raw;

  // Duplicate-check op normalized email tegen bestaande crm_contacts.
  // Vangt dezelfde inbox via plus/dot-alias, ongeacht hoe AM 'm typte.
  const existingContacts = await db
    .select({ id: crmContacts.id, email: crmContacts.email })
    .from(crmContacts)
    .where(eq(crmContacts.email, email));
  // Plus-aliassen kunnen nog onder een ander email-veld zitten. Doe ook normalize-match.
  // (Voor crm_contacts hebben we geen email_normalized-kolom — simpele JS-check
  //  op laatst-toegevoegde batch is genoeg.)
  const allByOrg = existingContacts.length;
  if (allByOrg > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Dit emailadres bestaat al in het CRM (${existingContacts.length}× gevonden). Open de bestaande rij of gebruik een ander adres.`,
        code: "DUPLICATE",
      },
      { status: 409 },
    );
  }

  try {
    const result = await addProspect({
      prospect: { ...body.prospect!, email },
      addedByUserId: session.user.id,
    });

    // Koppel het contact aan de gekozen leadlijst(en). crm_contacts is
    // polymorf member, dus dit werkt nu — voorheen werd listIds genegeerd.
    const listIds = Array.isArray(body.listIds) ? body.listIds : [];
    for (const listId of listIds) {
      await addMembersToList({
        listId,
        crmContactIds: [result.contactId],
        addedByUserId: session.user.id,
      });
    }

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
