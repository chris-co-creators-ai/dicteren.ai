// Eenmalig: zet een vast wachtwoord op Roy's credential-account.
// Run: cd web && bun --conditions=react-server scripts/set-am-roy-password.ts
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { neon } from "@neondatabase/serverless";

const EMAIL = "roy@dicteren.ai";
const PASSWORD = "Blablabla1!";

const sql = neon(process.env.DATABASE_URL!);

const rows = (await sql`
  SELECT a.id FROM auth.account a
  JOIN auth."user" u ON u.id = a."userId"
  WHERE u.email = ${EMAIL} AND a."providerId" = 'credential'
  LIMIT 1
`) as Array<{ id: string }>;

if (!rows.length) {
  console.error(`GEEN credential-account voor ${EMAIL}`);
  process.exit(1);
}

const hash = await hashPassword(PASSWORD);
await sql`UPDATE auth.account SET password = ${hash}, "updatedAt" = now() WHERE id = ${rows[0].id}`;

const ok = await verifyPassword({ password: PASSWORD, hash });
console.log(`Wachtwoord gezet voor ${EMAIL}. Verify: ${ok ? "OK" : "FAALT"}`);
process.exit(ok ? 0 : 1);
