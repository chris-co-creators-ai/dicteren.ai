// Seed statische ICP-velden in crm_custom_columns.
// crm_custom_columns is voor velden zonder provenance: KvK, BTW, branche-vereniging,
// specialisatie, aantal vestigingen, hoofdkantoor. Enrichment-velden (workEmail,
// phone, jobTitle, linkedinUrl, etc.) horen in crm_enrichment_facts, niet hier.
//
// Idempotent. Verwijdert eerst foute enrichment-keys uit een eerdere run, voegt
// daarna de juiste statische set toe. Re-runnen is veilig.
//
// Run met:
//   cd web && bun run scripts/seed-crm-static-columns.ts

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
);

type CustomColumnType = "text" | "number" | "date" | "select";

type Field = {
  name: string;
  type: CustomColumnType;
  options?: string[];
};

// Statische ICP-velden — geen provenance nodig, één waarde per klant.
const STATIC_FIELDS: Field[] = [
  { name: "KvK-nummer", type: "text" },
  { name: "BTW-nummer", type: "text" },
  {
    name: "Branche-vereniging",
    type: "select",
    options: ["NOvA", "KNB", "NVM", "BIG", "Anders"],
  },
  { name: "Specialisatie", type: "text" },
  { name: "Aantal vestigingen", type: "number" },
  { name: "Hoofdkantoor", type: "text" },
];

// Keys uit eerdere foute enrichment-poging via custom_columns.
// Deze velden horen in crm_enrichment_facts, niet hier.
const REMOVE_KEYS = [
  "custom:linkedin_link",
  "custom:prive_mail",
  "custom:telefoon",
  "custom:functie",
  "custom:niveau_in_het_bedrijf",
  "custom:afdeling",
  "custom:mail_bron",
  "custom:mail_zekerheid",
  "custom:mail_laatst_gecheckt",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

async function main() {
  let removed = 0;
  for (const key of REMOVE_KEYS) {
    const res = await sql`
      DELETE FROM crm_custom_columns WHERE key = ${key}
    `;
    const count = (res as { count?: number }).count ?? 0;
    if (count > 0) {
      console.log(`DROP  ${key}`);
      removed += count;
    }
  }

  let added = 0;
  let skipped = 0;
  let position = Date.now() % 1_000_000;

  for (const f of STATIC_FIELDS) {
    const key = `custom:${slugify(f.name)}`;
    const existing = await sql`
      SELECT id FROM crm_custom_columns WHERE key = ${key} LIMIT 1
    `;
    if (existing.length > 0) {
      console.log(`SKIP  ${f.name.padEnd(28)} key=${key}`);
      skipped++;
      continue;
    }
    await sql`
      INSERT INTO crm_custom_columns
        (key, name, type, options, owner_user_id, is_shared, position)
      VALUES
        (${key},
         ${f.name},
         ${f.type},
         ${f.options ? JSON.stringify(f.options) : null}::jsonb,
         NULL,
         TRUE,
         ${position})
    `;
    console.log(`ADD   ${f.name.padEnd(28)} key=${key} type=${f.type}`);
    added++;
    position++;
  }

  console.log("");
  console.log(
    `Klaar. ${removed} verwijderd, ${added} toegevoegd, ${skipped} overgeslagen.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed mislukt:", err);
  process.exit(1);
});
