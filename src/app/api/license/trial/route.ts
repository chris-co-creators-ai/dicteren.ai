// Dicteren.ai — Self-service trial activation
//
// Anonymous 14-day trial. Triggered from the desktop app's onboarding
// "Probeer 14 dagen gratis" button. No account / email required —
// device fingerprint is the only identity.
//
// Anti-abuse: 1 trial per device-fingerprint, permanent. If the same
// fingerprint has any existing trial (DIC-TRIAL-* code), we either
// re-activate it (if still active+not expired) or refuse a new trial.

import { NextResponse } from "next/server";
import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { devices, licenseActivations, licenses } from "@/lib/db/schema";
import {
  calculateTrialExpiry,
  generateTrialCode,
  hashLicenseCode,
  isExpired,
  logEvent,
  signLicenseToken,
  trackEvent,
} from "@/lib/services";
import { TRIAL_DEFAULTS } from "@/lib/config/plans";

type TrialResponse =
  | {
      success: true;
      token: string;
      license: {
        status: "active" | "expired";
        type: "beta";
        expiresAt: string | null;
      };
      activation: { deviceFingerprint: string; activatedAt: string };
      isExisting: boolean;
    }
  | { success: false; error: string; code?: string };

interface TrialRequest {
  deviceFingerprint?: string;
  platform?: string;
  appVersion?: string;
}

function clientError(
  status: number,
  error: string,
  code: string,
): NextResponse<TrialResponse> {
  void trackEvent("license_trial_failed", { reason: code });
  return NextResponse.json<TrialResponse>(
    { success: false, error, code },
    { status },
  );
}

export async function POST(request: Request) {
  let body: TrialRequest;
  try {
    body = (await request.json()) as TrialRequest;
  } catch {
    return clientError(400, "Ongeldige aanvraag.", "invalid_json");
  }

  const fingerprint = body.deviceFingerprint?.trim();
  if (!fingerprint) {
    return clientError(400, "Apparaat-id is verplicht.", "missing_fingerprint");
  }

  // Upsert device row first — we need its id for the lookup.
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

  // Has this device ever started a trial? Look for a license with DIC-TRIAL-*
  // code that this device has an activation on.
  const existing = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
      activationId: licenseActivations.id,
    })
    .from(licenses)
    .innerJoin(
      licenseActivations,
      eq(licenseActivations.licenseId, licenses.id),
    )
    .where(
      and(
        eq(licenseActivations.deviceId, device.id),
        like(licenses.code, "DIC-TRIAL-%"),
      ),
    )
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const lic = existing[0];

    // Still active and not expired → reactivate, return fresh token.
    if (lic.status === "active" && !isExpired(lic.expiresAt)) {
      await db
        .update(licenseActivations)
        .set({
          isActive: true,
          deactivatedAt: null,
          lastTokenIssuedAt: now,
        })
        .where(eq(licenseActivations.id, lic.activationId));

      const token = signLicenseToken({
        licenseId: lic.id,
        licenseCode: lic.code,
        type: "beta",
        status: "active",
        expiresAt: lic.expiresAt ? lic.expiresAt.toISOString() : null,
        deviceFingerprint: fingerprint,
        issuedAt: now.toISOString(),
      });
      if (!token.success) {
        return NextResponse.json<TrialResponse>(
          { success: false, error: "Token-ondertekening mislukt." },
          { status: 500 },
        );
      }
      await trackEvent("license_trial_reactivated");

      return NextResponse.json<TrialResponse>({
        success: true,
        token: token.data,
        license: {
          status: "active",
          type: "beta",
          expiresAt: lic.expiresAt ? lic.expiresAt.toISOString() : null,
        },
        activation: {
          deviceFingerprint: fingerprint,
          activatedAt: now.toISOString(),
        },
        isExisting: true,
      });
    }

    // Expired or revoked trial → no second trial, ever.
    return clientError(
      403,
      "Je proefperiode is al gebruikt op dit apparaat. Koop een licentie om door te gaan.",
      "trial_already_used",
    );
  }

  // First trial on this device — create license + activation.
  const code = generateTrialCode();
  const codeHash = hashLicenseCode(code);
  const expiresAt = calculateTrialExpiry();

  const [license] = await db
    .insert(licenses)
    .values({
      code,
      codeHash,
      type: "beta",
      status: "active",
      seats: 1,
      maxActivationsPerSeat: TRIAL_DEFAULTS.maxActivations,
      issuedAt: now,
      expiresAt,
      notes: "Self-service 14-day trial",
    })
    .returning();

  await db.insert(licenseActivations).values({
    licenseId: license.id,
    deviceId: device.id,
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

  const token = signLicenseToken({
    licenseId: license.id,
    licenseCode: code,
    type: "beta",
    status: "active",
    expiresAt: expiresAt.toISOString(),
    deviceFingerprint: fingerprint,
    issuedAt: now.toISOString(),
  });
  if (!token.success) {
    return NextResponse.json<TrialResponse>(
      { success: false, error: "Token-ondertekening mislukt." },
      { status: 500 },
    );
  }

  await logEvent({
    action: "license.created",
    entityType: "license",
    entityId: license.id,
    metadata: {
      kind: "trial",
      deviceFingerprint: fingerprint,
      platform: body.platform ?? null,
      appVersion: body.appVersion ?? null,
    },
  });
  await trackEvent("license_trial_started", {
    platform: body.platform ?? null,
  });

  return NextResponse.json<TrialResponse>({
    success: true,
    token: token.data,
    license: {
      status: "active",
      type: "beta",
      expiresAt: expiresAt.toISOString(),
    },
    activation: {
      deviceFingerprint: fingerprint,
      activatedAt: now.toISOString(),
    },
    isExisting: false,
  });
}
