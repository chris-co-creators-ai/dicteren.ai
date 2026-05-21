// Dicteren.ai — Trial license service
// Trial is a 14-day free license tied to a Neon Auth account.
//
//  - Claimed on web (no device yet) → server inserts license, mails code.
//  - 1 trial per userId, permanent.
//  - Anti-abuse device check happens at activate-time (see api/license/activate).

import "server-only";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licenses,
  licenseActivations,
  devices,
  type License,
} from "@/lib/db/schema";
import { TRIAL_DEFAULTS } from "@/lib/config/plans";
import {
  calculateTrialExpiry,
  generateTrialCode,
  hashLicenseCode,
  isExpired,
} from "./license";

export type ClaimTrialResult =
  | {
      success: true;
      license: License;
      isExisting: boolean;
    }
  | { success: false; error: string; code: TrialErrorCode };

export type TrialErrorCode =
  | "trial_already_used"
  | "trial_revoked"
  | "unknown_user";

/**
 * Web-initiated trial claim for a logged-in user.
 *
 *   - First time: insert trial license tied to userId, return new.
 *   - Existing active trial: return it (no new email — caller handles).
 *   - Existing expired/revoked trial: refuse (no second trial per account).
 */
export async function claimTrialForUser(args: {
  userId: string;
}): Promise<ClaimTrialResult> {
  // Look up any prior trial for this user.
  const [existing] = await db
    .select()
    .from(licenses)
    .where(
      and(
        eq(licenses.userId, args.userId),
        like(licenses.code, "DIC-TRIAL-%"),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "revoked") {
      return {
        success: false,
        error: "Je proefperiode is ingetrokken. Neem contact op met support.",
        code: "trial_revoked",
      };
    }
    if (existing.status === "active" && !isExpired(existing.expiresAt)) {
      return { success: true, license: existing, isExisting: true };
    }
    // expired / canceled / refunded → no second chance
    return {
      success: false,
      error:
        "Je hebt je gratis proefperiode al gebruikt. Kies een licentie om door te gaan.",
      code: "trial_already_used",
    };
  }

  // Fresh trial.
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
      userId: args.userId,
      seats: 1,
      maxActivationsPerSeat: TRIAL_DEFAULTS.maxActivations,
      issuedAt: new Date(),
      expiresAt,
      notes: "Self-service 14-day trial (web-initiated)",
    })
    .returning();

  return { success: true, license, isExisting: false };
}

/**
 * Anti-abuse check: has this device-fingerprint ever activated any DIFFERENT
 * trial license? Used by /api/license/activate before letting a trial code
 * register on a new device.
 *
 * Returns the conflicting license-id if found, otherwise null.
 */
export async function trialAlreadyUsedOnDevice(args: {
  fingerprint: string;
  excludeLicenseId: string;
}): Promise<string | null> {
  const [row] = await db
    .select({ id: licenses.id })
    .from(licenses)
    .innerJoin(licenseActivations, eq(licenseActivations.licenseId, licenses.id))
    .innerJoin(devices, eq(devices.id, licenseActivations.deviceId))
    .where(
      and(
        eq(devices.fingerprint, args.fingerprint),
        like(licenses.code, "DIC-TRIAL-%"),
      ),
    )
    .limit(1);
  if (!row || row.id === args.excludeLicenseId) return null;
  return row.id;
}
