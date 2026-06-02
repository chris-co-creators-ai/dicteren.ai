// Dicteren.ai — AM stuurt een brand-identity-verzoek naar een geïnteresseerde
// partner/reseller. Mail gaat via Resend; reageren komt bij de AM zelf binnen
// (replyTo = account-manager-email). De partner stuurt de bestanden in de reply.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { getCrmOrganization, getPrimaryContact, logCrmEvent } from "@/lib/services/crmDeals";
import { sendBrandIdentityRequestEmail } from "@/lib/services/orgEmail";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const org = await getCrmOrganization(id);
  if (!org) {
    return NextResponse.json(
      { success: false, error: "Organisatie niet gevonden" },
      { status: 404 },
    );
  }
  const primary = await getPrimaryContact(id);
  if (!primary?.email) {
    return NextResponse.json(
      { success: false, error: "Voeg eerst een primair contact met e-mail toe." },
      { status: 400 },
    );
  }

  const mail = await sendBrandIdentityRequestEmail({
    to: primary.email,
    contactName: primary.name,
    organizationName: org.name,
    accountManagerName: session.user.name,
    accountManagerEmail: session.user.email,
  });
  if (!mail.success) {
    return NextResponse.json(
      { success: false, error: mail.error, code: mail.code },
      { status: 502 },
    );
  }

  await logCrmEvent({
    crmOrganizationId: id,
    crmContactId: primary.id,
    actorUserId: session.user.id,
    kind: "email_sent",
    payload: {
      kind: "brand_identity_request",
      to: primary.email,
      replyTo: session.user.email,
    },
  });

  return NextResponse.json({ success: true, sentTo: primary.email });
}
