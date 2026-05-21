// Dicteren.ai — License Activation Action
// Domain orchestration: validate code, check status/expiry/limit, upsert
// activation, sign token. Service layer (license, token, audit) provides
// the reusable mechanics.

import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { devices, licenseActivations, licenses } from "@/lib/db/schema";
import {
  hashLicenseCode,
  isExpired,
  logEvent,
  signLicenseToken,
  trackEvent,
  trialAlreadyUsedOnDevice,
  validateLicenseCodeFormat,
} from "@/lib/services";
import type { ActivationRequest, ActivationResponse } from "@/lib/types";

const ALLOWED_ACTIVATION_STATUSES = new Set(["active", "trial"] as const);

function clientError(
  status: number,
  error: string,
  reason: string,
): NextResponse<ActivationResponse> {
  void trackEvent("license_activation_failed", { reason });
  return NextResponse.json<ActivationResponse>(
    { success: false, error },
    { status },
  );
}

export async function POST(request: Request) {
  let body: ActivationRequest;
  try {
    body = (await request.json()) as ActivationRequest;
  } catch {
    return clientError(400, "Ongeldige aanvraag.", "invalid_json");
  }

  if (!body?.licenseCode || !body?.deviceFingerprint) {
    return clientError(400, "Licentiecode en apparaat-id zijn verplicht.", "missing_fields");
  }

  const format = validateLicenseCodeFormat(body.licenseCode);
  if (!format.success) {
    return clientError(400, format.error, "invalid_format");
  }

  const codeHash = hashLicenseCode(body.licenseCode);

  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.codeHash, codeHash))
    .limit(1);

  if (!license) {
    return clientError(
      404,
      "Licentiecode niet gevonden. Controleer de code en probeer opnieuw.",
      "not_found",
    );
  }

  if (license.status === "revoked" || license.status === "refunded") {
    return clientError(
      403,
      "Deze licentie is niet meer geldig. Neem contact op met support.",
      `status_${license.status}`,
    );
  }

  if (license.status === "canceled" || license.status === "expired") {
    return clientError(
      403,
      "Je licentie is verlopen. Verleng om door te gaan.",
      `status_${license.status}`,
    );
  }

  if (!ALLOWED_ACTIVATION_STATUSES.has(license.status as "active" | "trial")) {
    return clientError(
      403,
      "Je betaling is mislukt. Werk je betaalgegevens bij om door te gaan.",
      `status_${license.status}`,
    );
  }

  if (isExpired(license.expiresAt)) {
    // Lazy expire: keep DB honest so future lookups skip the check.
    await db
      .update(licenses)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(licenses.id, license.id), eq(licenses.status, license.status)));
    return clientError(
      403,
      "Je licentie is verlopen. Verleng om door te gaan.",
      "expired",
    );
  }

  const fingerprint = body.deviceFingerprint.trim();

  // Anti-abuse: a trial code can only be activated on a device that has never
  // hosted a different trial before. Prevents account-spam to get fresh trials
  // on the same machine.
  const isTrialCode = license.code.startsWith("DIC-TRIAL-");
  if (isTrialCode) {
    const conflict = await trialAlreadyUsedOnDevice({
      fingerprint,
      excludeLicenseId: license.id,
    });
    if (conflict) {
      return clientError(
        403,
        "Dit apparaat heeft al een proefperiode gebruikt. Koop een licentie om door te gaan.",
        "trial_device_already_used",
      );
    }
  }

  // Upsert device on fingerprint. Multiple licenses may share a device.
  const [device] = await db
    .insert(devices)
    .values({
      fingerprint,
      platform: body.platform ?? null,
      appVersion: body.appVersion ?? null,
    })
    .onConflictDoUpdate({
      target: devices.fingerprint,
      set: {
        platform: body.platform ?? null,
        appVersion: body.appVersion ?? null,
        lastSeenAt: new Date(),
      },
    })
    .returning();

  // Reactivation path: same (license, device) already exists → no counter bump.
  const [existing] = await db
    .select()
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.licenseId, license.id),
        eq(licenseActivations.deviceId, device.id),
      ),
    )
    .limit(1);

  const now = new Date();

  if (!existing) {
    const seatLimit = license.seats * license.maxActivationsPerSeat;
    const [{ count: activeCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(licenseActivations)
      .where(
        and(
          eq(licenseActivations.licenseId, license.id),
          eq(licenseActivations.isActive, true),
        ),
      );

    if (activeCount >= seatLimit) {
      return clientError(
        409,
        `Maximum aantal apparaten bereikt (${seatLimit}). Deactiveer een ander apparaat om door te gaan.`,
        "limit_reached",
      );
    }

    await db.insert(licenseActivations).values({
      licenseId: license.id,
      deviceId: device.id,
      userId: license.userId,
      activatedAt: now,
      lastTokenIssuedAt: now,
      isActive: true,
    });

    await db
      .update(licenses)
      .set({
        activationCount: sql`${licenses.activationCount} + 1`,
        updatedAt: now,
      })
      .where(eq(licenses.id, license.id));
  } else {
    await db
      .update(licenseActivations)
      .set({
        isActive: true,
        deactivatedAt: null,
        lastTokenIssuedAt: now,
      })
      .where(eq(licenseActivations.id, existing.id));
  }

  const token = signLicenseToken({
    licenseId: license.id,
    licenseCode: license.code,
    type: license.type,
    status: license.status,
    expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
    deviceFingerprint: fingerprint,
    issuedAt: now.toISOString(),
  });

  if (!token.success) {
    return NextResponse.json<ActivationResponse>(
      { success: false, error: "Token-ondertekening mislukt. Probeer het later opnieuw." },
      { status: 500 },
    );
  }

  await logEvent({
    action: "license.activated",
    entityType: "license",
    entityId: license.id,
    actorId: license.userId,
    metadata: {
      deviceFingerprint: fingerprint,
      platform: body.platform ?? null,
      appVersion: body.appVersion ?? null,
      reactivation: Boolean(existing),
    },
  });
  await trackEvent("license_activation_succeeded", {
    licenseType: license.type,
    reactivation: Boolean(existing),
  });

  return NextResponse.json<ActivationResponse>({
    success: true,
    token: token.data,
    license: {
      status: license.status,
      type: license.type,
      expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
    },
    activation: {
      deviceFingerprint: fingerprint,
      activatedAt: now.toISOString(),
    },
  });
}
