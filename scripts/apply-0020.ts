import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
);

// Apply migration 0020: crm_enrichment_facts + crm_signals.
// neon-http runs each query in its own implicit txn, so we send statements
// one at a time. Re-runs tolerate "already exists" errors.

const STEPS: { label: string; sql: string }[] = [
  {
    label: "create crm_enrichment_facts",
    sql: `CREATE TABLE crm_enrichment_facts (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id      uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
      organization_id uuid REFERENCES crm_organizations(id) ON DELETE CASCADE,
      field_key       text NOT NULL,
      value           text NOT NULL,
      provider        text NOT NULL,
      confidence      smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100),
      source_url      text,
      verified_at     timestamptz NOT NULL DEFAULT now(),
      created_at      timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT crm_enrichment_facts_entity_present
        CHECK (contact_id IS NOT NULL OR organization_id IS NOT NULL)
    )`,
  },
  {
    label: "idx crm_enrichment_facts (contact, field)",
    sql: `CREATE INDEX crm_enrichment_facts_contact_field_idx
          ON crm_enrichment_facts (contact_id, field_key)`,
  },
  {
    label: "idx crm_enrichment_facts (org, field)",
    sql: `CREATE INDEX crm_enrichment_facts_org_field_idx
          ON crm_enrichment_facts (organization_id, field_key)`,
  },
  {
    label: "idx crm_enrichment_facts resolver",
    sql: `CREATE INDEX crm_enrichment_facts_resolver_idx
          ON crm_enrichment_facts (field_key, confidence DESC, verified_at DESC)`,
  },
  {
    label: "create crm_signals",
    sql: `CREATE TABLE crm_signals (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id       uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
      organization_id  uuid REFERENCES crm_organizations(id) ON DELETE CASCADE,
      kind             text NOT NULL,
      payload          jsonb NOT NULL,
      detected_at      timestamptz NOT NULL DEFAULT now(),
      score            smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
      status           text NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'actioned', 'dismissed', 'expired')),
      actioned_task_id uuid REFERENCES crm_org_tasks(id) ON DELETE SET NULL,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT crm_signals_entity_present
        CHECK (contact_id IS NOT NULL OR organization_id IS NOT NULL)
    )`,
  },
  {
    label: "idx crm_signals (status, score)",
    sql: `CREATE INDEX crm_signals_routing_idx
          ON crm_signals (status, score DESC)`,
  },
  {
    label: "idx crm_signals (org, status)",
    sql: `CREATE INDEX crm_signals_org_status_idx
          ON crm_signals (organization_id, status)`,
  },
  {
    label: "idx crm_signals (contact, status)",
    sql: `CREATE INDEX crm_signals_contact_status_idx
          ON crm_signals (contact_id, status)`,
  },
];

console.log(`Running ${STEPS.length} statements`);
for (const [i, step] of STEPS.entries()) {
  try {
    await sql.query(step.sql);
    console.log(`  [${i + 1}/${STEPS.length}] ${step.label}`);
  } catch (err) {
    const msg = (err as Error).message;
    if (/already exists/i.test(msg)) {
      console.log(`  [${i + 1}/${STEPS.length}] − ${step.label} (already)`);
      continue;
    }
    console.error(`  [${i + 1}/${STEPS.length}] FAIL ${step.label}`);
    console.error(`    ${msg}`);
    process.exit(1);
  }
}
console.log("\nMigration 0020 applied.");
