// Dicteren.ai — Partner-login bij publiceren.
//
// Bij het publiceren van een partner maken we (indien nodig) een Better Auth-
// credential-account aan en koppelen dat aan de affiliate, zodat de partner in
// z'n portaal (/affiliate/dashboard) kan. Rol-agnostisch: dit werkt ook als een
// account_manager publiceert — de admin-plugin `createUser` is admin-only, dus die
// gebruiken we hier NIET. We zetten een random wachtwoord; de partner stelt z'n
// eigen wachtwoord in via de set-password-link in de welkomstmail.

import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { dbAuth } from "@/lib/db";
import { authUser, authAccount } from "@/lib/db/auth-schema";
import { validateAndNormalizeEmail } from "@/lib/services/emailNormalize";

/** Zorg dat er een login bestaat voor deze partner-mail. Bestaat de user al →
 *  return die id (we koppelen 'm, maken geen tweede account). Anders een nieuw
 *  credential-account met een random wachtwoord. Null bij een ongeldig adres. */
export async function ensurePartnerAuthAccount(
  email: string,
  name: string,
): Promise<{ userId: string; created: boolean } | null> {
  const norm = validateAndNormalizeEmail(email);
  if (!norm.ok) return null;

  const [existing] = await dbAuth
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.emailNormalized, norm.normalized))
    .limit(1);
  if (existing) return { userId: existing.id, created: false };

  const userId = randomUUID();
  await dbAuth.insert(authUser).values({
    id: userId,
    name,
    email: norm.raw,
    emailNormalized: norm.normalized,
    emailVerified: true, // door de AM aangemaakt = vertrouwd
    role: "user",
    accountType: "personal",
  });

  // Random wachtwoord dat de partner nooit gebruikt — die stelt z'n eigen in via
  // de set-password-link. hashPassword = Better Auth's eigen scrypt (niet zelf hashen).
  const tempPassword = `${randomUUID()}${randomUUID()}`;
  await dbAuth.insert(authAccount).values({
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(tempPassword),
  });

  return { userId, created: true };
}
