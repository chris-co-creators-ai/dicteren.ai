// Dicteren.ai — License Activation Action
// This ACTION orchestrates domain rules: validate code, check limits, create activation
// It calls SERVICE functions for reusable mechanics (normalize, hash, sign token)

import { NextResponse } from "next/server";
import type { ActivationRequest, ActivationResponse } from "@/lib/types";
import {
  validateLicenseCodeFormat,
  normalizeLicenseCode,
  hashLicenseCode,
  isExpired,
  signLicenseToken,
  logEvent,
  trackEvent,
} from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ActivationRequest;

    // 1. Validate input format (service: reusable validation)
    const validation = validateLicenseCodeFormat(body.licenseCode);
    if (!validation.success) {
      await trackEvent("license_activation_failed", { reason: "invalid_format" });
      return NextResponse.json<ActivationResponse>(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    // 2. Normalize and hash (service: reusable mechanics)
    const normalized = normalizeLicenseCode(body.licenseCode);
    const _codeHash = hashLicenseCode(body.licenseCode);

    // 3. Look up license in database (domain logic — stays here)
    // TODO: Query database when Neon is connected
    // const license = await db.licenses.findByCode(normalized);
    const license = null as null; // placeholder

    if (!license) {
      await trackEvent("license_activation_failed", { reason: "not_found" });
      return NextResponse.json<ActivationResponse>(
        { success: false, error: "Licentiecode niet gevonden. Controleer de code en probeer opnieuw." },
        { status: 404 },
      );
    }

    // 4. Check license status (domain rule — stays here)
    // TODO: Implement when database is connected
    // if (license.status === "revoked") { return error }
    // if (license.status === "expired" || isExpired(license.expiresAt)) { return error }
    // if (activationCount >= license.maxActivations) { return error }

    // 5. Create activation record (domain rule — stays here)
    // TODO: Insert into license_activations table

    // 6. Sign token for desktop app (service: reusable mechanics)
    // const tokenResult = signLicenseToken({ ... });

    // 7. Log audit event (service: reusable mechanics)
    // await logEvent({ action: "license.activated", entityType: "license", entityId: license.id });
    // await trackEvent("license_activation_succeeded");

    // Placeholder response until database is connected
    return NextResponse.json<ActivationResponse>(
      {
        success: false,
        error: "Licentie-activatie wordt nog gebouwd. Database verbinding nodig.",
      },
      { status: 503 },
    );
  } catch {
    return NextResponse.json<ActivationResponse>(
      { success: false, error: "Er is een fout opgetreden. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}
