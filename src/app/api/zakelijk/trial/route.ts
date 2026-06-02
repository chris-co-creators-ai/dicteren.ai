// Dicteren.ai — Zakelijke 14-dagen-trial (self-service + AM-deelbaar).
//
// Zelfde aanmelding als een betaalde zakelijke deal (org + bedrijfsgegevens +
// BTW), maar zonder betaling: de prospect krijgt direct een team-licentie met
// status "trial" en kan 14 dagen testen. Bij upgraden koopt hij seats op de
// bestaande org (zakelijke staffel).
//
// Ref-tracking: ?am=<userId> koppelt de lead aan een account-manager;
// ?reseller=1 (of een affiliate-ref) zet de bron op reseller-recruitment.
// Zo kan een AM de "Start 14 dagen gratis"-link delen met prospects én
// resellers vanuit het CRM side-panel.

import { NextResponse } from "next/server";
import { and, eq, like } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { authUsers, licenses } from "@/lib/db/schema";
import {
  deriveOrganizationSlug,
  upsertOrganizationBilling,
} from "@/lib/services/organization";
import {
  generateTrialCode,
  hashLicenseCode,
  calculateTrialExpiry,
} from "@/lib/services/license";
import { TRIAL_DEFAULTS } from "@/lib/config/plans";
import { createCrmOrganization, addCrmContact } from "@/lib/services/crmDeals";
import { sendTrialStartedEmail } from "@/lib/services/email";
import { logEvent, trackEvent } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rateLimit";

type BusinessTrialBody = {
  organizationName?: string;
  vatNumber?: string | null;
  countryCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  billingEmail?: string | null;
  /** Ref-velden uit de gedeelde link (querystring → form → body). */
  amUserId?: string | null;
  reseller?: boolean | null;
};

function clientError(status: number, error: string, code: string) {
  return NextResponse.json({ success: false, error, code }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return clientError(401, "Inloggen vereist", "UNAUTH");

  const blocked = await enforceRateLimit(request, "zakelijk:trial", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  // 1 trial per user (consumer OF zakelijk) — discriminator = code-prefix.
  const [existingTrial] = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(
      and(
        eq(licenses.userId, session.user.id),
        like(licenses.code, "DIC-TRIAL-%"),
      ),
    )
    .limit(1);
  if (existingTrial) {
    return clientError(
      403,
      "Je hebt je gratis proefperiode al gebruikt. Kies een plan om door te gaan.",
      "trial_already_used",
    );
  }

  let body: BusinessTrialBody;
  try {
    body = (await request.json()) as BusinessTrialBody;
  } catch {
    return clientError(400, "Body ontbreekt", "INVALID_BODY");
  }

  const organizationName = body.organizationName?.trim();
  if (!organizationName) {
    return clientError(400, "Bedrijfsnaam is verplicht.", "MISSING_ORG_NAME");
  }

  // ───── Auth.organization aanmaken (session-user wordt owner) ─────
  const slug = deriveOrganizationSlug(organizationName);
  let createdOrg;
  try {
    createdOrg = await auth.api.createOrganization({
      headers: await headers(),
      body: { name: organizationName, slug, keepCurrentActiveOrganization: false },
    });
  } catch (err) {
    console.error("[zakelijk/trial] createOrganization failed", err);
    return clientError(500, "Aanmaken van organisatie mislukt. Probeer opnieuw.", "ORG_CREATE_FAILED");
  }
  if (!createdOrg?.id) {
    return clientError(500, "Aanmaken van organisatie gaf geen ID terug.", "ORG_CREATE_EMPTY");
  }
  const orgId = createdOrg.id;

  await logEvent({
    action: "organization.created",
    entityType: "organization",
    entityId: orgId,
    actorId: session.user.id,
    metadata: { name: organizationName, slug, via: "business_trial" },
  });

  // ───── Bedrijfsgegevens (BTW, adres) vastleggen ─────
  await upsertOrganizationBilling(orgId, {
    billingEmail: body.billingEmail?.trim() || session.user.email,
    vatNumber: body.vatNumber?.trim() || null,
    countryCode: body.countryCode?.trim() || "NL",
    addressLine1: body.addressLine1?.trim() || null,
    addressLine2: body.addressLine2?.trim() || null,
    postalCode: body.postalCode?.trim() || null,
    city: body.city?.trim() || null,
    purchaseOrderNumber: null,
    notes: null,
  });

  // ───── Team-trial-licentie (status "trial", 14 dagen, geen beta) ─────
  const code = generateTrialCode();
  const codeHash = hashLicenseCode(code);
  const expiresAt = calculateTrialExpiry();
  const [license] = await db
    .insert(licenses)
    .values({
      code,
      codeHash,
      type: "team",
      status: "trial",
      userId: session.user.id,
      organizationId: orgId,
      seats: 1,
      maxActivationsPerSeat: TRIAL_DEFAULTS.maxActivations,
      issuedAt: new Date(),
      expiresAt,
      notes: "Self-service zakelijke 14-daagse trial",
    })
    .returning();

  // ───── CRM-lead zodat de AM 'm ziet en kan opvolgen ─────
  // Bron + eigenaar uit de ref: reseller > am > self-service.
  // am-ref valideren: alleen een echte staff-user mag lead-eigenaar worden.
  // Voorkomt dat een willekeurige ?am=<id> de lead aan iemand toewijst.
  let amUserId: string | null = null;
  const rawAm = body.amUserId?.trim() || null;
  if (rawAm) {
    const [staff] = await db
      .select({ id: authUsers.id, role: authUsers.role })
      .from(authUsers)
      .where(eq(authUsers.id, rawAm))
      .limit(1);
    if (staff && (staff.role === "admin" || staff.role === "account_manager")) {
      amUserId = staff.id;
    }
  }
  const source = body.reseller
    ? "reseller_recruitment"
    : amUserId
      ? "am_outreach"
      : "self_service";
  try {
    const crmOrg = await createCrmOrganization({
      actorUserId: session.user.id,
      data: {
        name: organizationName,
        source,
        status: "lead",
        accountOwnerId: amUserId,
        authOrganizationId: orgId,
        vatNumber: body.vatNumber?.trim() || null,
        countryCode: body.countryCode?.trim() || "NL",
        addressLine1: body.addressLine1?.trim() || null,
        addressLine2: body.addressLine2?.trim() || null,
        postalCode: body.postalCode?.trim() || null,
        city: body.city?.trim() || null,
        notes: `Zakelijke trial gestart ${new Date().toLocaleDateString("nl-NL")}. Loopt tot ${expiresAt.toLocaleDateString("nl-NL")}.`,
      },
    });
    await addCrmContact({
      actorUserId: session.user.id,
      data: {
        crmOrganizationId: crmOrg.id,
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        authUserId: session.user.id,
        isPrimary: true,
      },
    });
  } catch (err) {
    // CRM-lead is secundair — een mislukte lead mag de trial niet blokkeren.
    console.warn("[zakelijk/trial] crm lead failed", err);
  }

  // ───── Trial-code mailen ─────
  const mail = await sendTrialStartedEmail({
    to: session.user.email,
    name: session.user.name ?? undefined,
    licenseCode: code,
    expiresAt,
    userId: session.user.id,
    licenseId: license.id,
  });
  if (!mail.success) {
    console.warn("[zakelijk/trial] trial mail failed", mail.error, mail.code);
  }

  await trackEvent("trial_claimed", { isExisting: false, segment: "team" });

  return NextResponse.json({
    success: true,
    license: {
      id: license.id,
      code,
      expiresAt: expiresAt.toISOString(),
    },
    organizationId: orgId,
  });
}
