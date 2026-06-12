// Eenmalig/idempotent: Pi aanmaken — de GTM-agent als volwaardige medewerker.
// Run: cd web && bun --conditions=react-server scripts/create-pi-agent.ts
//
// Pi krijgt rol account_manager zodat hij overal verschijnt waar het team
// verschijnt (assignee-dropdowns, @mentions, CRM-toewijzing, borden). Plus een
// credential-account voor de OAuth-login vanuit Hermes, en een gedeeld bord
// "Pi — GTM" waar AM's taken voor Pi op kunnen zetten. GEEN licentie (Pi is geen
// desktop-gebruiker). Wachtwoord wordt naar een lokaal bestand buiten de repo
// geschreven (~/.hermes/dicteren-pi-credentials.txt), nooit naar de chat/git.
import { randomBytes } from "node:crypto";
import { writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { hashPassword } from "better-auth/crypto";
import { neon } from "@neondatabase/serverless";
import { createBoard, listBoards } from "@/lib/services/kanban";

const EMAIL = "pi@dicteren.ai";
const NAME = "Pi";
const sql = neon(process.env.DATABASE_URL!);

// 1. User upserten (idempotent op email). assistant_name = "Pi" markeert de agent.
const existing = (await sql`
  SELECT id FROM auth."user" WHERE lower(email) = ${EMAIL.toLowerCase()} LIMIT 1
`) as Array<{ id: string }>;

let userId: string;
if (existing.length) {
  userId = existing[0].id;
  await sql`
    UPDATE auth."user"
    SET role = 'account_manager', "emailVerified" = true,
        assistant_name = 'Pi', "updatedAt" = now()
    WHERE id = ${userId}
  `;
  console.log(`SKIP user ${EMAIL} bestond al (${userId}) — rol/flags bijgewerkt`);
} else {
  const inserted = (await sql`
    INSERT INTO auth."user" (name, email, email_normalized, "emailVerified", role, assistant_name, "createdAt", "updatedAt")
    VALUES (${NAME}, ${EMAIL}, ${EMAIL.toLowerCase()}, true, 'account_manager', 'Pi', now(), now())
    RETURNING id
  `) as Array<{ id: string }>;
  userId = inserted[0].id;
  console.log(`USER ${EMAIL} -> ${userId} (account_manager, verified)`);
}

// 2. Credential-account met een sterk wachtwoord (Hermes logt hiermee in via OAuth).
const acct = (await sql`
  SELECT id FROM auth.account WHERE "providerId" = 'credential' AND "userId" = ${userId} LIMIT 1
`) as Array<{ id: string }>;

const password = randomBytes(24).toString("base64url");
const hash = await hashPassword(password);
if (acct.length) {
  await sql`UPDATE auth.account SET password = ${hash}, "updatedAt" = now()
           WHERE "providerId" = 'credential' AND "userId" = ${userId}`;
  console.log(`ACCT credential bijgewerkt (nieuw wachtwoord)`);
} else {
  await sql`
    INSERT INTO auth.account ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (${userId}, 'credential', ${userId}, ${hash}, now(), now())
  `;
  console.log(`ACCT credential aangemaakt`);
}

// Wachtwoord lokaal opslaan, buiten repo + chat.
const credPath = join(homedir(), ".hermes", "dicteren-pi-credentials.txt");
writeFileSync(
  credPath,
  `Dicteren.ai — Pi agent-login\nE-mail: ${EMAIL}\nWachtwoord: ${password}\nLogin-URL: https://www.dicteren.ai/auth/sign-in\nMCP-endpoint: https://www.dicteren.ai/api/mcp\nAangemaakt: ${new Date().toISOString()}\n`,
  "utf8",
);
chmodSync(credPath, 0o600);
console.log(`CRED wachtwoord weggeschreven naar ${credPath} (chmod 600)`);

// 3. Gedeeld bord "Pi — GTM" zodat AM's taken voor Pi kunnen aanmaken/taggen.
const boards = await listBoards(userId);
const piBoard = boards.find((b) => b.name === "Pi — GTM");
if (piBoard) {
  console.log(`SKIP bord "Pi — GTM" bestond al (${piBoard.id})`);
} else {
  const board = await createBoard({
    name: "Pi — GTM",
    description:
      "Taken voor Pi, onze GTM-agent. Zet hier verrijkings-, research- en outreach-opdrachten neer.",
    visibility: "shared",
    color: "aqua",
    ownerUserId: userId,
  });
  console.log(`BORD "Pi — GTM" aangemaakt (${board.id}, gedeeld)`);
}

console.log("\nKlaar. Pi staat als medewerker in het team.");
process.exit(0);
