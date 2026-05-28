// Dicteren.ai — Licentie vervangen (revoke oude + uitgifte nieuwe + mailen).
//
// Use-case: klant heeft licentiecode niet ontvangen of denkt dat de code
// gecompromitteerd is. Admin/AM klikt "Vervang licentie" → oude rij krijgt
// status='revoked' + revokedAt, nieuwe rij wordt aangemaakt met zelfde
// type/seats/userId/orgId/expiresAt + source='admin-replace', mail naar user.
//
// Activations van de oude license worden óók geforceerd uitgelogd
// (license-token wordt niet opnieuw geldig).

import "server-only";
import { and, eq } from "drizzle-orm";
import { dbAuth, db } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";
import { licenseActivations, licenses } from "@/lib/db/schema";
import {
  generateLicenseCode,
  hashLicenseCode,
} from "./license";
import { sendLicenseEmail } from "./email";
import { logEvent } from "./audit";

export type ReplaceLicenseResult =
  | {
      success: true;
      oldLicenseId: string;
      oldCode: string;
      newLicenseId: string;
      newCode: string;
      mailSent: boolean;
      mailError?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

export async function replaceLicense(args: {
  licenseId: string;
  actorUserId: string;
  reason?: string;
}): Promise<ReplaceLicenseResult> {
  const [old] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, args.licenseId))
    .limit(1);
  if (!old) {
    return { success: false, error: "Licentie niet gevonden", code: "NOT_FOUND" };
  }
  if (old.status === "revoked" || old.status === "refunded") {
    return {
      success: false,
      error: "Licentie is al ingetrokken of refunded — geen nieuwe nodig",
      code: "ALREADY_TERMINATED",
    };
  }
  if (old.type === "partner") {
    return {
      success: false,
      error: "Partner-licenties worden niet vervangen via deze flow. Maak handmatig een nieuwe partner-code aan.",
      code: "PARTNER_NOT_SUPPORTED",
    };
  }

  // 1. Genereer unieke nieuwe code.
  let newCode: string;
  let newCodeHash: string;
  let attempts = 0;
  while (true) {
    newCode = generateLicenseCode(old.type);
    newCodeHash = hashLicenseCode(newCode);
    const [clash] = await db
      .select({ id: licenses.id })
      .from(licenses)
      .where(eq(licenses.codeHash, newCodeHash))
      .limit(1);
    if (!clash) break;
    if (++attempts > 5) {
      return {
        success: false,
        error: "Codegeneratie mislukt",
        code: "CODE_GEN_FAILED",
      };
    }
  }

  // 2. Insert nieuwe license met zelfde context.
  const [newLic] = await db
    .insert(licenses)
    .values({
      code: newCode,
      codeHash: newCodeHash,
      type: old.type,
      status: "active",
      userId: old.userId,
      organizationId: old.organizationId,
      orderId: old.orderId,
      planId: old.planId,
      seats: old.seats,
      maxActivationsPerSeat: old.maxActivationsPerSeat,
      issuedAt: new Date(),
      expiresAt: old.expiresAt,
      source: "admin-replace",
      discountType: old.discountType,
      discountValue: old.discountValue,
      notes:
        `Vervangt ${old.code} (${old.id}). Reden: ${args.reason ?? "admin-actie"}.`,
    })
    .returning();

  // 3. Revoke oude license + deactiveer alle activations.
  await db
    .update(licenses)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      updatedAt: new Date(),
      notes:
        (old.notes ? old.notes + "\n" : "") +
        `Vervangen door ${newCode} (${newLic.id}) op ${new Date().toISOString()}.`,
    })
    .where(eq(licenses.id, old.id));

  await db
    .update(licenseActivations)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(
      and(
        eq(licenseActivations.licenseId, old.id),
        eq(licenseActivations.isActive, true),
      ),
    );

  // 4. Audit
  await logEvent({
    action: "license.created",
    entityType: "license",
    entityId: newLic.id,
    actorId: args.actorUserId,
    metadata: {
      kind: "replace",
      replacesLicenseId: old.id,
      replacesCode: old.code,
      reason: args.reason ?? null,
    },
  });

  await logEvent({
    action: "license.activation_revoked",
    entityType: "license",
    entityId: old.id,
    actorId: args.actorUserId,
    metadata: {
      kind: "replaced",
      newLicenseId: newLic.id,
      newCode,
      reason: args.reason ?? null,
    },
  });

  // 5. Mail nieuwe code naar user als die er is.
  let mailSent = false;
  let mailError: string | undefined;
  if (newLic.userId) {
    const [user] = await dbAuth
      .select({ email: authUser.email, name: authUser.name })
      .from(authUser)
      .where(eq(authUser.id, newLic.userId))
      .limit(1);
    if (user?.email) {
      const result = await sendLicenseEmail({
        to: user.email,
        name: user.name,
        licenseCode: newCode,
        expiresAt: newLic.expiresAt,
        orderId: newLic.orderId ?? undefined,
        licenseId: newLic.id,
        userId: newLic.userId,
      });
      mailSent = result.success;
      if (!result.success) mailError = result.error;
    }
  }

  return {
    success: true,
    oldLicenseId: old.id,
    oldCode: old.code,
    newLicenseId: newLic.id,
    newCode,
    mailSent,
    mailError,
  };
}
