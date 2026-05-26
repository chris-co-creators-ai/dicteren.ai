// Dicteren.ai — License Status Action
// Verifies token, looks up fresh license + activation state, reissues a
// fresh token (no counter bump — beslissing 7 in handoff 2026-05-21).
//
// Called by the desktop app on startup + daily heartbeat. The desktop uses
// the response to decide UI state (active / past_due / expired / refunded).

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  devices,
  licenseActivations,
  licenses,
  plans,
  subscriptions,
} from "@/lib/db/schema";
import {
  enforceRateLimit,
  isExpired,
  signLicenseToken,
  verifyLicenseToken,
} from "@/lib/services";
import type { LicenseStatus, LicenseType } from "@/lib/types";

type StatusResponse =
  | {
      success: true;
      token: string;
      license: {
        status: LicenseStatus;
        type: LicenseType;
        expiresAt: string | null;
        /** Plan-naam, bv. "Persoonlijk maand" — null voor trial/partner. */
        planLabel: string | null;
        /** "monthly" | "quarterly" | "yearly" | "lifetime" | null */
        period: string | null;
        /** Bron van uitgifte: self-signup | admin-grant | partner:ORG-X */
        source: string | null;
        /** Discount-snapshot bij issue (uit Mollie metadata). */
        discountType: string | null;
        discountValue: number | null;
        /** Status van Mollie subscription (active/canceled/...), null = geen. */
        subscriptionStatus: string | null;
        /** Volgende incasso (ISO), null = lifetime / geen sub. */
        nextBillingAt: string | null;
      };
    }
  | { success: false; error: string; code?: string };

function unauthorized(error: string, code: string) {
  return NextResponse.json<StatusResponse>(
    { success: false, error, code },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return unauthorized("Token ontbreekt.", "NO_TOKEN");

  const verified = verifyLicenseToken(token);
  if (!verified.success) {
    return unauthorized(verified.error, verified.code ?? "INVALID_TOKEN");
  }

  const { licenseId, deviceFingerprint } = verified.data;

  // Per-device rate-limit. Tauri heartbeat is dagelijks; 60/10min is ruim
  // voor legitiem polling-gedrag maar zet een dak op een gecompromitteerd token.
  const blocked = await enforceRateLimit(request, "license:status", {
    key: `device:${deviceFingerprint}`,
    message: "Te veel status-checks. Probeer opnieuw.",
  });
  if (blocked) return blocked;

  // Look up license + this device's activation in one round-trip.
  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.fingerprint, deviceFingerprint))
    .limit(1);
  if (!device) {
    return unauthorized("Apparaat onbekend. Activeer opnieuw.", "DEVICE_NOT_FOUND");
  }

  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1);
  if (!license) {
    return unauthorized("Licentie niet gevonden.", "LICENSE_NOT_FOUND");
  }

  const [activation] = await db
    .select()
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.licenseId, license.id),
        eq(licenseActivations.deviceId, device.id),
      ),
    )
    .limit(1);
  if (!activation || !activation.isActive) {
    return unauthorized("Activatie ingetrokken. Activeer opnieuw.", "ACTIVATION_REVOKED");
  }

  // Lazy expire: if expiresAt has passed but DB still says active, fix the row
  // so admin reports stay accurate.
  let currentStatus: LicenseStatus = license.status;
  if (
    isExpired(license.expiresAt) &&
    currentStatus !== "expired" &&
    currentStatus !== "refunded" &&
    currentStatus !== "revoked"
  ) {
    await db
      .update(licenses)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(licenses.id, license.id), eq(licenses.status, currentStatus)));
    currentStatus = "expired";
  }

  // Touch lastTokenIssuedAt + device.lastSeenAt for admin "Laatst gezien".
  const now = new Date();
  await Promise.all([
    db
      .update(licenseActivations)
      .set({ lastTokenIssuedAt: now })
      .where(eq(licenseActivations.id, activation.id)),
    db
      .update(devices)
      .set({ lastSeenAt: now })
      .where(eq(devices.id, device.id)),
  ]);

  // Reissue token with fresh status — counter is NOT incremented (beslissing 7).
  const fresh = signLicenseToken({
    licenseId: license.id,
    licenseCode: license.code,
    type: license.type,
    status: currentStatus,
    expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
    deviceFingerprint,
    issuedAt: now.toISOString(),
  });

  if (!fresh.success) {
    return NextResponse.json<StatusResponse>(
      { success: false, error: "Token-ondertekening mislukt.", code: "SIGN_FAILED" },
      { status: 500 },
    );
  }

  // Plan-label (cosmetic — voor "Persoonlijk maand" in Tauri abonnement-page).
  let planLabel: string | null = null;
  let planPeriod: string | null = null;
  if (license.planId) {
    const [p] = await db
      .select({ label: plans.label, period: plans.period })
      .from(plans)
      .where(eq(plans.id, license.planId))
      .limit(1);
    if (p) {
      planLabel = p.label;
      planPeriod = p.period;
    }
  }

  // Subscription-state (voor "Volgende incasso DD-MM-YYYY" in Tauri).
  const [sub] = await db
    .select({
      status: subscriptions.status,
      nextBillingAt: subscriptions.nextBillingAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.licenseId, license.id))
    .limit(1);

  return NextResponse.json<StatusResponse>({
    success: true,
    token: fresh.data,
    license: {
      status: currentStatus,
      type: license.type,
      expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
      planLabel,
      period: planPeriod,
      source: license.source ?? null,
      discountType: license.discountType ?? null,
      discountValue: license.discountValue ?? null,
      subscriptionStatus: sub?.status ?? null,
      nextBillingAt: sub?.nextBillingAt?.toISOString() ?? null,
    },
  });
}
