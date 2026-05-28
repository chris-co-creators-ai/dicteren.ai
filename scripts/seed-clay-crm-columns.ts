// Seed Clay-stijl GTM-velden als custom CRM-kolommen in crm_custom_columns.
// Idempotent op key — bestaande rijen blijven staan. Run met:
//   cd web && bun run scripts/seed-clay-crm-columns.ts
//
// Daarna verschijnen de velden in /admin/crm onder "Kolommen beheren"
// en kan elke gebruiker ze per profiel aan/uit zetten.

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

const FIELDS: Field[] = [
  { name: "LinkedIn-link", type: "text" },
  { name: "Privé-mail", type: "text" },
  { name: "Telefoon", type: "text" },
  { name: "Functie", type: "text" },
  {
    name: "Niveau in het bedrijf",
    type: "select",
    options: ["Medewerker", "Manager", "Hoofd", "Directeur", "Eigenaar"],
  },
  {
    name: "Afdeling",
    type: "select",
    options: [
      "Verkoop",
      "Techniek",
      "Marketing",
      "Bedrijfsvoering",
      "Financiën",
      "HR",
      "Anders",
    ],
  },
  { name: "Specialisatie", type: "text" },
  { name: "Mail-bron", type: "text" },
  {
    name: "Mail-zekerheid",
    type: "select",
    options: ["Geverifieerd", "Hoog", "Gemiddeld", "Laag", "Onzeker"],
  },
  { name: "Mail laatst gecheckt", type: "date" },
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
  let added = 0;
  let skipped = 0;
  let position = Date.now() % 1_000_000;

  for (const f of FIELDS) {
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
  console.log(`Klaar. ${added} toegevoegd, ${skipped} overgeslagen.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed mislukt:", err);
  process.exit(1);
});
