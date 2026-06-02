// Dicteren.ai — Mail de zakelijke 14-dagen-trial-link naar het primaire
// contact van een CRM-organisatie (staff). De AM deelt 'm zo zonder z'n eigen
// mailclient. am=accountOwnerId zodat de lead bij de AM landt.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getCrmOrganization,
  getPrimaryContact,
  logCrmEvent,
} from "@/lib/services/crmDeals";
import { sendBusinessTrialInviteEmail } from "@/lib/services/email";
import { appBase } from "@/lib/url";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  const org = await getCrmOrganization(orgId);
  if (!org) {
    return NextResponse.json(
      { success: false, error: "Organisatie niet gevonden" },
      { status: 404 },
    );
  }

  const primary = await getPrimaryContact(orgId);
  if (!primary?.email) {
    return NextResponse.json(
      { success: false, error: "Voeg eerst een primair contact met e-mail toe" },
      { status: 400 },
    );
  }

  let body: { reseller?: boolean } = {};
  try {
    body = (await request.json()) as { reseller?: boolean };
  } catch {
    /* lege body = geen reseller */
  }
  const reseller = Boolean(body.reseller);

  const base = appBase();
  const link =
    `${base}/zakelijk/trial` +
    (org.accountOwnerId ? `?am=${org.accountOwnerId}` : "") +
    (reseller ? `${org.accountOwnerId ? "&" : "?"}reseller=1` : "");

  const mail = await sendBusinessTrialInviteEmail({
    to: primary.email,
    name: primary.name,
    trialUrl: link,
  });

  await logCrmEvent({
    crmOrganizationId: orgId,
    crmContactId: primary.id,
    actorUserId: session.user.id,
    kind: "payment_link_sent",
    payload: {
      kind: "trial_invite",
      to: primary.email,
      reseller,
      emailSuccess: mail.success,
      emailError: mail.success ? null : mail.error,
    },
  });

  return NextResponse.json({
    success: mail.success,
    emailSent: mail.success,
    to: primary.email,
  });
}
