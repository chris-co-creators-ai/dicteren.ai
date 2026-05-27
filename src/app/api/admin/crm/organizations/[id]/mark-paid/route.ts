// Dicteren.ai — Admin: deal markeren als handmatig betaald (offline)
//
// Voor klanten die per factuur willen betalen (SEPA, niet via Mollie).
// Zet status op 'won' en paid_at op nu. Logt event voor audit-trail.
// Bouwt GEEN auth.organization of licenses op — dat moet later handmatig
// via /admin/organizations of license-grant.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth/session";
import { crmOrganizations } from "@/lib/db/schema/crmDeals";
import {
  getCrmOrganization,
  logCrmEvent,
} from "@/lib/services/crmDeals";
import { logEvent } from "@/lib/services/audit";

type Params = Promise<{ id: string }>;

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  const org = await getCrmOrganization(orgId);
  if (!org) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty body OK
  }

  const note = (body.note as string | null) ?? null;
  const invoiceRef = (body.invoiceRef as string | null) ?? null;
  const amountCents = body.amountCents
    ? Number(body.amountCents)
    : org.proposedAmountCents;

  await db
    .update(crmOrganizations)
    .set({
      status: "won",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(crmOrganizations.id, org.id));

  await logCrmEvent({
    crmOrganizationId: org.id,
    actorUserId: session.user.id,
    kind: "marked_paid_offline",
    payload: {
      amountCents,
      invoiceRef,
      note,
    },
  });

  await logEvent({
    action: "crm_org.marked_paid_offline",
    entityType: "crm_organization",
    entityId: org.id,
    actorId: session.user.id,
    metadata: { amountCents, invoiceRef },
  });

  return NextResponse.json({ success: true });
}
