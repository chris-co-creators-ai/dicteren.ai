// Dicteren.ai — Admin: betaal-link mail opnieuw versturen (Route C)
//
// Hergebruikt de bestaande Mollie checkout-URL als die nog werkt.
// Stuurt sendB2BPaymentLinkEmail met isResend=true.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getCrmOrganization,
  getPrimaryContact,
  logCrmEvent,
} from "@/lib/services/crmDeals";
import { getPlanBySlug } from "@/lib/services/order";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { sendB2BPaymentLinkEmail } from "@/lib/services/orgEmail";
import { logEvent } from "@/lib/services/audit";

type Params = Promise<{ id: string }>;

export async function POST(
  _request: Request,
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
  if (!org.paymentLinkUrl || !org.proposedPlanSlug || !org.proposedSeats || !org.proposedAmountCents) {
    return NextResponse.json(
      {
        success: false,
        error: "Eerst betaal-link genereren via 'Stuur betaal-link'",
      },
      { status: 400 },
    );
  }

  const primary = await getPrimaryContact(orgId);
  if (!primary?.email) {
    return NextResponse.json(
      { success: false, error: "Geen contact gevonden" },
      { status: 400 },
    );
  }

  const plan = await getPlanBySlug(org.proposedPlanSlug);
  if (!plan) {
    return NextResponse.json(
      { success: false, error: "Plan niet beschikbaar" },
      { status: 400 },
    );
  }

  const [ownerRow] = await db
    .select({ name: authUsers.name })
    .from(authUsers)
    .where(eq(authUsers.id, org.accountOwnerId ?? session.user.id))
    .limit(1);

  const mailResult = await sendB2BPaymentLinkEmail({
    to: primary.email,
    contactName: primary.name,
    organizationName: org.name,
    seats: org.proposedSeats,
    amountCents: org.proposedAmountCents,
    planLabel: plan.label,
    checkoutUrl: org.paymentLinkUrl,
    accountManagerName: ownerRow?.name,
    isResend: true,
  });

  await logCrmEvent({
    crmOrganizationId: org.id,
    crmContactId: primary.id,
    actorUserId: session.user.id,
    kind: "payment_link_resent",
    payload: {
      to: primary.email,
      emailSuccess: mailResult.success,
      emailId: mailResult.success ? mailResult.data.id : null,
    },
  });

  await logEvent({
    action: "crm_org.payment_link_resent",
    entityType: "crm_organization",
    entityId: org.id,
    actorId: session.user.id,
    metadata: { contactEmail: primary.email },
  });

  return NextResponse.json({
    success: true,
    data: { emailSent: mailResult.success },
  });
}
