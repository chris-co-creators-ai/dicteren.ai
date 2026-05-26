// Import maatschappelijke outreach-pipeline CSV in partner_organizations.
// Idempotent op external_id: bestaande rijen worden geüpdatet, nieuwe ingevoegd.
// Run met: bun run scripts/import-partner-orgs.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { partnerOrganizations } from "../src/lib/db/schema";
import { parseCsvWithHeader, emptyToNull } from "../src/lib/csv";

const CSV_PATH = resolve(
  __dirname,
  "../../outreach/dicteren-ai-maatschappelijke-outreach-pipeline.csv",
);

// Oorspronkelijke pipeline-CSV is semicolon-gescheiden.
const parseCsv = (raw: string) =>
  parseCsvWithHeader(raw, { separator: ";" });

const HEADER_TO_COL: Record<string, string> = {
  ID: "external_id",
  Prioriteit: "priority",
  Segment: "segment",
  Organisatie: "organization_name",
  Type: "organization_type",
  "Waarom relevant": "why_relevant",
  Samenwerkingshoek: "partnership_angle",
  "Aanbevolen openingszin": "opening_line",
  Aanbod: "offer",
  "Beslisser/afdeling": "decision_maker",
  Email: "email",
  Telefoon: "phone",
  Adres: "address",
  Plaats: "city",
  Website: "website",
  "Contact URL": "contact_url",
  "Bron URL": "source_url",
  Bronstatus: "source_status",
  "Bron gecontroleerd op": "source_verified_at",
  "Account owner": "account_owner",
  "Outreach status": "outreach_status",
  "Laatste contactdatum": "last_contact_date",
  "Volgende actie": "next_action",
  "Follow-up datum": "follow_up_date",
  "Reactie samenvatting": "response_summary",
  "Pilot status": "pilot_status",
  "Aantal gratis codes": "free_codes_count",
  Partnercode: "partner_code",
  "AVG/notities": "gdpr_notes",
};

async function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const { header, rows } = parseCsv(raw);
  console.log(`CSV: ${rows.length} organisaties, ${header.length} kolommen`);

  // Map header → DB column name. Onbekende headers worden gelogd en overgeslagen.
  const colMap: (string | null)[] = header.map((h) => {
    const mapped = HEADER_TO_COL[h.trim()];
    if (!mapped) console.warn(`  ⚠️  onbekende kolom in CSV: "${h}"`);
    return mapped ?? null;
  });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const record: Record<string, string | number | null> = {};
    for (let i = 0; i < colMap.length; i++) {
      const col = colMap[i];
      if (!col) continue;
      const v = emptyToNull(row[i] ?? "");
      if (col === "free_codes_count") {
        record[col] = v === null ? null : Number.parseInt(v, 10) || null;
      } else if (col === "partner_code") {
        // partner_code wordt later via issuePartnerCode gevuld; uit CSV negeren.
        continue;
      } else {
        record[col] = v;
      }
    }
    if (!record.external_id || !record.organization_name) {
      skipped++;
      continue;
    }

    const existing = await db.execute(
      sql`SELECT id FROM partner_organizations WHERE external_id = ${record.external_id as string} LIMIT 1`,
    );
    const hasExisting = (existing as unknown as { rows: unknown[] }).rows?.length;
    if (hasExisting) {
      const set = Object.entries(record)
        .filter(([k]) => k !== "external_id")
        .map(([k, v]) => sql`${sql.identifier(k)} = ${v}`);
      if (set.length > 0) {
        const assignments = sql.join(set, sql`, `);
        await db.execute(
          sql`UPDATE partner_organizations SET ${assignments}, updated_at = now() WHERE external_id = ${record.external_id as string}`,
        );
      }
      updated++;
    } else {
      const cols = Object.keys(record);
      const vals = Object.values(record);
      const colsSql = sql.join(
        cols.map((c) => sql.identifier(c)),
        sql`, `,
      );
      const valsSql = sql.join(
        vals.map((v) => sql`${v}`),
        sql`, `,
      );
      await db.execute(
        sql`INSERT INTO partner_organizations (${colsSql}) VALUES (${valsSql})`,
      );
      inserted++;
    }
  }

  console.log(`\nResultaat: ${inserted} ingevoegd, ${updated} bijgewerkt, ${skipped} overgeslagen`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
