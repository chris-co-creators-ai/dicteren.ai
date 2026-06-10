// Eenmalig: AM-account roy@dicteren.ai aanmaken + lifetime-licentie.
// Run: cd web && bun --conditions=react-server scripts/create-am-roy.ts
//
// Volgt het geverifieerde standalone-patroon (memory reference_auth_user_create):
// better-auth/crypto hasher + directe insert in auth.user/auth.account, daarna
// de canonieke grantLifetimeLicense-service. Idempotent: skipt als roy al bestaat.
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { grantLifetimeLicense } from "@/lib/services/adminGrant";

const GRANTER = "27a4ea0a-ad8e-4240-8116-3d3a84de3a9d"; // info@dicteren.ai (Christian Bleeker)
const EMAIL = "roy@dicteren.ai";
const NAME = "Roy";

const sql = neon(process.env.DATABASE_URL!);

// 1. User upserten (idempotent op email).
const existingUser = (await sql`
  SELECT id, role FROM auth."user" WHERE lower(email) = ${EMAIL.toLowerCase()} LIMIT 1
`) as Array<{ id: string; role: string | null }>;

let userId: string;
if (existingUser.length) {
  userId = existingUser[0].id;
  console.log(`SKIP user  ${EMAIL} bestaat al (${userId}, role=${existingUser[0].role})`);
  await sql`
    UPDATE auth."user"
    SET role = 'account_manager', "emailVerified" = true, "updatedAt" = now()
    WHERE id = ${userId}
  `;
} else {
  const inserted = (await sql`
    INSERT INTO auth."user" (name, email, email_normalized, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${NAME}, ${EMAIL}, ${EMAIL.toLowerCase()}, true, 'account_manager', now(), now())
    RETURNING id
  `) as Array<{ id: string }>;
  userId = inserted[0].id;
  console.log(`USER  ${EMAIL} -> ${userId} (account_manager, verified)`);
}

// 2. Credential-account upserten met random temp-password.
//    Roy zet zijn eigen wachtwoord via /auth/forgot-password.
const existingAccount = (await sql`
  SELECT id FROM auth.account WHERE "providerId" = 'credential' AND "userId" = ${userId} LIMIT 1
`) as Array<{ id: string }>;

if (existingAccount.length) {
  console.log(`SKIP account credential bestaat al voor ${EMAIL}`);
} else {
  const tempPassword = randomBytes(16).toString("hex");
  const hash = await hashPassword(tempPassword);
  await sql`
    INSERT INTO auth.account ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (${userId}, 'credential', ${userId}, ${hash}, now(), now())
  `;
  console.log(`ACCT  credential aangemaakt (temp-password, wordt nooit gebruikt)`);
}

// 3. Lifetime-licentie via de canonieke admin-grant-flow (idempotent).
const existingLicense = await db
  .select({ code: licenses.code })
  .from(licenses)
  .where(
    and(
      eq(licenses.userId, userId),
      eq(licenses.source, "admin-grant"),
      eq(licenses.discountType, "lifetime"),
      eq(licenses.status, "active"),
    ),
  );

if (existingLicense.length) {
  console.log(`SKIP lifetime ${EMAIL} heeft al: ${existingLicense[0].code}`);
} else {
  const r = await grantLifetimeLicense({
    userId,
    type: "consumer",
    grantedByUserId: GRANTER,
    notes: "Lifetime team-access",
  });
  console.log(`GRANT lifetime ${EMAIL} -> ${r.code} (${r.licenseId})`);
}

console.log(`\nKlaar. Roy zet zijn wachtwoord via: https://www.dicteren.ai/auth/forgot-password?email=${encodeURIComponent(EMAIL)}`);
process.exit(0);
