// Dicteren.ai — Admin grants vanuit /admin/users.
//
// Twee soorten directe license-toekenningen door admin/account-manager:
//   1. grantLifetimeLicense  → expiresAt=null, type=consumer/team
//   2. grantFreeMonthsLicense → expiresAt=now+N maanden
//
// Beide bewust BUITEN de Mollie-flow: geen order, geen subscription. Pure
// license-insert. Zichtbaar in /admin/licenses, /admin/crm (kolom Discount
// + Korting/bron), /account/licenses van de klant — sync via bestaande
// listCustomerFunnel join.

import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import type { LicenseType } from "@/lib/types";
import {
  generateLicenseCode,
  hashLicenseCode,
} from "./license";

export type GrantResult = {
  licenseId: string;
  code: string;
  expiresAt: Date | null;
};

/** Geef een gebruiker lifetime gratis toegang. */
export async function grantLifetimeLicense(args: {
  userId: string;
  type?: "consumer" | "team";
  seats?: number;
  maxActivationsPerSeat?: number;
  notes?: string | null;
  grantedByUserId: string;
}): Promise<GrantResult> {
  const type: LicenseType = args.type ?? "consumer";
  const code = generateLicenseCode(type);
  const codeHash = hashLicenseCode(code);

  const [row] = await db
    .insert(licenses)
    .values({
      code,
      codeHash,
      type,
      status: "active",
      userId: args.userId,
      seats: args.seats ?? 1,
      maxActivationsPerSeat: args.maxActivationsPerSeat ?? 2,
      issuedAt: new Date(),
      expiresAt: null, // lifetime
      source: "admin-grant",
      discountType: "lifetime",
      discountValue: 0,
      notes:
        args.notes ??
        `Lifetime granted by admin ${args.grantedByUserId} on ${new Date().toISOString()}`,
    })
    .returning({ id: licenses.id, code: licenses.code });

  return {
    licenseId: row.id,
    code: row.code,
    expiresAt: null,
  };
}

/** Geef een gebruiker N maanden gratis. */
export async function grantFreeMonthsLicense(args: {
  userId: string;
  months: number;
  type?: "consumer" | "team";
  seats?: number;
  maxActivationsPerSeat?: number;
  notes?: string | null;
  grantedByUserId: string;
}): Promise<GrantResult> {
  const months = Math.max(1, Math.floor(args.months));
  const type: LicenseType = args.type ?? "consumer";
  const code = generateLicenseCode(type);
  const codeHash = hashLicenseCode(code);

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const [row] = await db
    .insert(licenses)
    .values({
      code,
      codeHash,
      type,
      status: "active",
      userId: args.userId,
      seats: args.seats ?? 1,
      maxActivationsPerSeat: args.maxActivationsPerSeat ?? 2,
      issuedAt: new Date(),
      expiresAt,
      source: "admin-grant",
      discountType: "free_months",
      discountValue: months,
      notes:
        args.notes ??
        `${months} mnd gratis granted by admin ${args.grantedByUserId} on ${new Date().toISOString()}`,
    })
    .returning({ id: licenses.id, code: licenses.code });

  return {
    licenseId: row.id,
    code: row.code,
    expiresAt,
  };
}

/** Telt admin-grant-licenses (lifetime + free-months) per user. Filtert op
 *  source zodat gewone betaalde/trial-licenties NIET meetellen. */
export async function countAdminGrantsForUser(userId: string): Promise<number> {
  const rows = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(
      and(eq(licenses.userId, userId), eq(licenses.source, "admin-grant")),
    );
  return rows.length;
}
