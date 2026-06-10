// ScrapeGraphAI-output → CRM. Verdeelt prospects round-robin over alle account
// managers, elk in een eigen (gedeelde) lead-lijst, en importeert via de bestaande
// importEnrichedProspects-service. Idempotent op (org, email).
//
// Run: cd web && bun --conditions=react-server scripts/import-agency-prospects.ts \
//        [pad/prospects.json] [--list-prefix "AI-experts"] [--source scrapegraph-ai]
//
// Default-segment is "Marketingbureaus" (agency_scraper.py). Voor andere segmenten
// (ai_expert_scraper.py) geef je --list-prefix en --source mee; per AM ontstaat dan
// een eigen lijst "<prefix> — <voornaam>".
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { and, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { db } from "@/lib/db";
import { leadLists, crmOrganizations } from "@/lib/db/schema";
import { createLeadList } from "@/lib/services/leadList";
import {
  importEnrichedProspects,
  type EnrichedProspectRow,
} from "@/lib/services/prospectImport";

const ADMIN = "27a4ea0a-ad8e-4240-8116-3d3a84de3a9d"; // Christian Bleeker (actor)
const COLORS = ["blue", "green", "orange", "purple", "aqua", "navy", "red", "gray"] as const;

const { values: flags, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    "list-prefix": { type: "string", default: "Marketingbureaus" },
    source: { type: "string", default: "scrapegraph-maps" },
  },
});
const LIST_PREFIX = flags["list-prefix"]!;
const SOURCE = flags.source!;
const jsonPath = positionals[0] ?? "scripts/data/prospects.json";

const sql = neon(process.env.DATABASE_URL!);

// 1. prospects.json eerst lezen — geen lijsten aanmaken op een kapot pad.
let rows: EnrichedProspectRow[];
try {
  const raw = readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw);
  rows = Array.isArray(parsed) ? parsed : parsed.prospects ?? parsed.rows ?? [];
} catch (err) {
  console.error(`Kan ${jsonPath} niet lezen: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
if (!rows.length) {
  console.error("prospects.json bevat geen rijen.");
  process.exit(1);
}

// 2. Account managers ophalen — SSOT is de rol in de DB, geen hardcoded ids.
const ams = (await sql`
  SELECT id, name, email FROM auth."user"
  WHERE role = 'account_manager'
  ORDER BY "createdAt"
`) as Array<{ id: string; name: string | null; email: string }>;
if (!ams.length) {
  console.error("Geen account managers (role='account_manager') gevonden.");
  process.exit(1);
}

// 3. Per AM een lead-lijst find-or-create ("<prefix> — <voornaam>").
async function ensureList(
  am: { id: string; name: string | null; email: string },
  color: string,
): Promise<string> {
  const first = am.name?.trim().split(/\s+/)[0] || am.email.split("@")[0];
  const name = `${LIST_PREFIX} — ${first}`;
  const [existing] = await db
    .select({ id: leadLists.id })
    .from(leadLists)
    .where(and(eq(leadLists.name, name), eq(leadLists.ownerUserId, am.id)))
    .limit(1);
  if (existing) return existing.id;
  const row = await createLeadList({
    name,
    ownerUserId: am.id,
    isShared: true,
    color: color as never,
    description: `Round-robin ${LIST_PREFIX.toLowerCase()}, gescrapet via ScrapeGraphAI.`,
  });
  return row.id;
}

const listIds: string[] = [];
for (let i = 0; i < ams.length; i++) {
  listIds.push(await ensureList(ams[i], COLORS[i % COLORS.length]));
}

// 4. Round-robin verdelen over de AM's.
const buckets: EnrichedProspectRow[][] = ams.map(() => []);
rows.forEach((row, idx) => buckets[idx % ams.length].push(row));

// 5. Per AM importeren met directe toewijzing + eigen lijst.
const totals = { created: 0, updated: 0, skipped: 0, errors: 0 };
for (let i = 0; i < ams.length; i++) {
  const bucket = buckets[i];
  if (!bucket.length) continue;
  const r = await importEnrichedProspects(bucket, {
    actorUserId: ADMIN,
    assignToUserId: ams[i].id,
    listId: listIds[i],
    source: SOURCE,
  });
  const first = ams[i].name?.trim().split(/\s+/)[0] || ams[i].email;
  console.log(
    `${first.padEnd(10)} → ${bucket.length} aangeboden | ${r.created} nieuw, ${r.updated} update, ${r.skipped} skip, ${r.errors.length} fout`,
  );
  totals.created += r.created;
  totals.updated += r.updated;
  totals.skipped += r.skipped;
  totals.errors += r.errors.length;
}

// 6. Org-kolommen verrijken (geïsoleerd; raakt de gedeelde import-service niet).
//    Alleen niet-lege velden, zodat bestaande org-data niet gewist wordt.
const orgSeen = new Set<string>();
let orgsEnriched = 0;
let orgConflicts = 0;
let orgFailed = 0;
for (const row of rows) {
  const company = (row.company ?? "").trim().slice(0, 200);
  if (!company || orgSeen.has(company.toLowerCase())) continue;
  orgSeen.add(company.toLowerCase());
  const extra = (row.extra ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    v != null && String(v).trim() !== "" ? String(v).trim() : null;
  const website = row.companyDomain ? `https://${row.companyDomain}` : null;
  const set = {
    ...(website ? { website } : {}),
    ...(str(extra.kvk) ? { kvk: str(extra.kvk)! } : {}),
    ...(str(extra.vatNumber) ? { vatNumber: str(extra.vatNumber)! } : {}),
    ...(str(extra.addressLine1) ? { addressLine1: str(extra.addressLine1)! } : {}),
    ...(str(extra.postalCode) ? { postalCode: str(extra.postalCode)! } : {}),
    ...(str(extra.houseNumber) ? { houseNumber: str(extra.houseNumber)! } : {}),
    ...(str(row.city ?? extra.city) ? { city: str(row.city ?? extra.city)! } : {}),
    ...(row.industry ? { industry: row.industry } : {}),
    ...(row.niche ? { niche: row.niche } : {}),
    countryCode: "NL",
    updatedAt: new Date(),
  };
  // Alleen updaten als er meer is dan country+timestamp.
  if (Object.keys(set).length <= 2) continue;
  try {
    await db.update(crmOrganizations).set(set).where(eq(crmOrganizations.name, company));
    orgsEnriched++;
  } catch {
    // KvK/BTW zijn uniek; een gescrapete dubbele waarde botst. Retry zonder die
    // velden zodat de rest (website, adres, postcode) wel landt.
    const { kvk: _k, vatNumber: _v, ...safe } = set as Record<string, unknown>;
    try {
      await db.update(crmOrganizations).set(safe).where(eq(crmOrganizations.name, company));
      orgsEnriched++;
      orgConflicts++;
    } catch {
      orgFailed++;
    }
  }
}

console.log(
  `\nKlaar. ${rows.length} prospects over ${ams.length} AM's: ` +
    `${totals.created} nieuw, ${totals.updated} geüpdatet, ${totals.skipped} overgeslagen, ${totals.errors} fouten. ` +
    `${orgsEnriched} organisaties verrijkt (${orgConflicts} zonder kvk/btw door botsing, ${orgFailed} mislukt).`,
);
process.exit(0);
