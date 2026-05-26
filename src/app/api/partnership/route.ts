// Dicteren.ai — Publiek partnership-aanmelding endpoint.
//
// Een aanmelding maakt:
//   1. Een affiliate-rij met status="pending" (admin moet activeren)
//   2. Een auth.user prospect-rij (als email nog niet bestaat)
//   3. Een customer_attributes-rij met stage="lead", source-tag, notes
//   4. Een contact_messages-rij met kind="partnership", gelinkt aan
//      affiliate en user voor audit + admin-zichtbaarheid
//
// Rate-limit: max 3 / 30 min per IP — partnership-spam is reëel.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { generateAffiliateCode } from "@/lib/services/affiliate";
import { addProspect } from "@/lib/services/prospect";
import {
  createContactMessage,
  enforceRateLimit,
  getClientIp,
  hashIp,
} from "@/lib/services";
import { logEvent } from "@/lib/services/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 200;
const MAX_EMAIL = 200;
const MAX_COMPANY = 200;
const MAX_PHONE = 50;
const MAX_MESSAGE = 4000;
const MAX_URL = 500;

function sanitize(input: string | undefined | null, max: number): string {
  if (!input) return "";
  return String(input).trim().slice(0, max);
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    company?: string;
    phone?: string;
    website?: string;
    targetSegment?: string;
    expectedVolume?: string;
    message?: string;
    metadata?: Record<string, unknown> | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  // Honeypot voor bots.
  if (
    body.metadata &&
    typeof body.metadata === "object" &&
    "fax" in body.metadata &&
    body.metadata.fax
  ) {
    return NextResponse.json({ success: true });
  }

  const name = sanitize(body.name, MAX_NAME);
  const email = sanitize(body.email, MAX_EMAIL).toLowerCase();
  const company = sanitize(body.company, MAX_COMPANY);
  const phone = sanitize(body.phone, MAX_PHONE);
  const website = sanitize(body.website, MAX_URL);
  const targetSegment = sanitize(body.targetSegment, 200);
  const expectedVolume = sanitize(body.expectedVolume, 100);
  const message = sanitize(body.message, MAX_MESSAGE);

  if (!name || !email || !company) {
    return NextResponse.json(
      {
        success: false,
        error: "Naam, e-mail en bedrijfsnaam zijn verplicht.",
      },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig e-mailadres." },
      { status: 400 },
    );
  }

  const ipHash = hashIp(getClientIp(request));
  const blocked = await enforceRateLimit(request, "partnership", {
    message:
      "Te veel aanmeldingen vanaf dit IP. Probeer over enkele minuten opnieuw.",
  });
  if (blocked) return blocked;

  // 1. Affiliate-rij met status pending. Idempotent op contact_email.
  const [existingAff] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(eq(affiliates.contactEmail, email))
    .limit(1);

  let affiliateId: string;
  if (existingAff) {
    affiliateId = existingAff.id;
  } else {
    let code = generateAffiliateCode();
    for (let i = 0; i < 5; i++) {
      const [exists] = await db
        .select({ id: affiliates.id })
        .from(affiliates)
        .where(eq(affiliates.code, code))
        .limit(1);
      if (!exists) break;
      code = generateAffiliateCode();
    }
    const [inserted] = await db
      .insert(affiliates)
      .values({
        code,
        name: company,
        contactEmail: email,
        contactPhone: phone || null,
        status: "pending",
        commissionType: "percentage",
        commissionPct: 0,
        commissionFixedCents: 0,
        internalNotes: [
          `Aanmelding: ${name}`,
          website ? `Site: ${website}` : null,
          targetSegment ? `Doelgroep: ${targetSegment}` : null,
          expectedVolume ? `Volume: ${expectedVolume}` : null,
          message ? `\n${message}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      })
      .returning({ id: affiliates.id });
    affiliateId = inserted.id;
  }

  // 2 + 3. Prospect-user + customer_attributes.
  const prospect = await addProspect({
    prospect: {
      email,
      name,
      company,
      phone: phone || null,
      source: "partnership-application",
      stage: "lead",
      temperature: "warm",
      notes: [
        `Partnership-aanvraag: ${company}`,
        website ? `Site: ${website}` : null,
        targetSegment ? `Doelgroep: ${targetSegment}` : null,
        expectedVolume ? `Verwacht volume: ${expectedVolume}` : null,
        message ? `\n${message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    addedByUserId: existingAff?.id ?? affiliateId,
  });

  // 4. Contact-message koppelt prospect + affiliate.
  await createContactMessage({
    kind: "partnership",
    name,
    email,
    company,
    phone: phone || null,
    subject: `Partnership-aanvraag van ${company}`,
    message: [
      `Naam: ${name}`,
      `Bedrijf: ${company}`,
      website ? `Site: ${website}` : null,
      phone ? `Telefoon: ${phone}` : null,
      targetSegment ? `Doelgroep: ${targetSegment}` : null,
      expectedVolume ? `Verwacht volume: ${expectedVolume}` : null,
      "",
      message || "(Geen bericht)",
    ]
      .filter((l) => l !== null)
      .join("\n"),
    metadata: {
      website: website || null,
      targetSegment: targetSegment || null,
      expectedVolume: expectedVolume || null,
    },
    ipHash,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    linkedAffiliateId: affiliateId,
    linkedUserId: prospect.userId,
  });

  await logEvent({
    action: "admin.action",
    entityType: "partnership_application",
    entityId: affiliateId,
    metadata: {
      kind: "submission",
      email,
      company,
      affiliateId,
      userId: prospect.userId,
      isNew: !existingAff,
    },
  });

  return NextResponse.json({
    success: true,
    affiliateId,
    isExisting: !!existingAff,
  });
}
