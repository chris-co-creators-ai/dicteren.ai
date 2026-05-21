// Dicteren.ai — License Status Action
// Verifies token, looks up fresh license + activation state, reissues a
// fresh token (no counter bump — beslissing 7 in handoff 2026-05-21).
//
// Called by the desktop app on startup + daily heartbeat. The desktop uses
// the response to decide UI state (active / past_due / expired / refunded).

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { devices, licenseActivations, licenses } from "@/lib/db/schema";
import { isExpired, signLicenseToken, verifyLicenseToken } from "@/lib/services";
import type { LicenseStatus } from "@/lib/types";

type StatusResponse =
  | {
      success: true;
      token: string;
      license: {
        status: LicenseStatus;
        type: "beta" | "consumer" | "team";
        expiresAt: string | null;
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

  return NextResponse.json<StatusResponse>({
    success: true,
    token: fresh.data,
    license: {
      status: currentStatus,
      type: license.type,
      expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
    },
  });
}
