// Dicteren.ai — Enrichment-laag (Clay-stijl)
//
// Append-only facts. Eén rij per (entity × field × provider). Nooit
// overschrijven. Bij re-scrape: nieuwe rij erbij. De resolver kiest de
// winnende waarde per veld via ORDER BY confidence DESC, verified_at DESC.
//
// Gebruik in plaats van directe crm_contacts.update voor velden die uit een
// scrape of API komen (work_email, phone, job_title, linkedin_url, etc.).
// Statische velden (kvk_nummer, branche_vereniging) blijven in
// crm_custom_columns + customer_attributes.custom_fields.

import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmEnrichmentFacts } from "@/lib/db/schema";

export type EnrichmentField = {
  value: string;
  provider: string;
  confidence: number;
  verifiedAt: Date;
  sourceUrl: string | null;
};

export type ResolvedFields = Record<string, EnrichmentField>;

export type StaleFact = {
  entityId: string;
  fieldKey: string;
  currentValue: string;
  lastProvider: string;
  lastVerifiedAt: Date;
};

/** Append a fact. Never updates an existing row. */
export async function recordEnrichmentFact(args: {
  contactId?: string | null;
  organizationId?: string | null;
  fieldKey: string;
  value: string;
  provider: string;
  /** 0-100. DB CHECK constraint enforces range. */
  confidence: number;
  sourceUrl?: string | null;
}): Promise<void> {
  if (!args.contactId && !args.organizationId) {
    throw new Error(
      "recordEnrichmentFact: contactId of organizationId is verplicht",
    );
  }
  if (args.confidence < 0 || args.confidence > 100) {
    throw new Error(
      `recordEnrichmentFact: confidence ${args.confidence} buiten bereik 0-100`,
    );
  }
  await db.insert(crmEnrichmentFacts).values({
    contactId: args.contactId ?? null,
    organizationId: args.organizationId ?? null,
    fieldKey: args.fieldKey,
    value: args.value,
    provider: args.provider,
    confidence: args.confidence,
    sourceUrl: args.sourceUrl ?? null,
  });
}

/** Resolve winning value per field for a contact. */
export async function resolveContactFields(
  contactId: string,
): Promise<ResolvedFields> {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (field_key)
      field_key,
      value,
      provider,
      confidence,
      verified_at,
      source_url
    FROM crm_enrichment_facts
    WHERE contact_id = ${contactId}
    ORDER BY field_key, confidence DESC, verified_at DESC
  `);
  const out: ResolvedFields = {};
  for (const r of rows as unknown as Array<{
    field_key: string;
    value: string;
    provider: string;
    confidence: number;
    verified_at: string | Date;
    source_url: string | null;
  }>) {
    out[r.field_key] = {
      value: r.value,
      provider: r.provider,
      confidence: r.confidence,
      verifiedAt:
        r.verified_at instanceof Date ? r.verified_at : new Date(r.verified_at),
      sourceUrl: r.source_url,
    };
  }
  return out;
}

/** Resolve winning value per field for an organization. */
export async function resolveOrganizationFields(
  organizationId: string,
): Promise<ResolvedFields> {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (field_key)
      field_key,
      value,
      provider,
      confidence,
      verified_at,
      source_url
    FROM crm_enrichment_facts
    WHERE organization_id = ${organizationId}
    ORDER BY field_key, confidence DESC, verified_at DESC
  `);
  const out: ResolvedFields = {};
  for (const r of rows as unknown as Array<{
    field_key: string;
    value: string;
    provider: string;
    confidence: number;
    verified_at: string | Date;
    source_url: string | null;
  }>) {
    out[r.field_key] = {
      value: r.value,
      provider: r.provider,
      confidence: r.confidence,
      verifiedAt:
        r.verified_at instanceof Date ? r.verified_at : new Date(r.verified_at),
      sourceUrl: r.source_url,
    };
  }
  return out;
}

/**
 * Find contacts where the winning fact for a field is older than
 * `olderThanDays` — candidates for re-scrape.
 */
export async function staleFactsForRescrape(args: {
  fieldKey: string;
  olderThanDays: number;
  limit?: number;
}): Promise<StaleFact[]> {
  const limit = args.limit ?? 100;
  const olderThan = new Date(
    Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000,
  );
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (contact_id)
      contact_id,
      field_key,
      value,
      provider,
      verified_at
    FROM crm_enrichment_facts
    WHERE field_key = ${args.fieldKey}
      AND contact_id IS NOT NULL
    ORDER BY contact_id, confidence DESC, verified_at DESC
  `);
  const stale: StaleFact[] = [];
  for (const r of rows as unknown as Array<{
    contact_id: string;
    field_key: string;
    value: string;
    provider: string;
    verified_at: string | Date;
  }>) {
    const verifiedAt =
      r.verified_at instanceof Date ? r.verified_at : new Date(r.verified_at);
    if (verifiedAt > olderThan) continue;
    stale.push({
      entityId: r.contact_id,
      fieldKey: r.field_key,
      currentValue: r.value,
      lastProvider: r.provider,
      lastVerifiedAt: verifiedAt,
    });
    if (stale.length >= limit) break;
  }
  return stale;
}

/** List all facts for one entity and one field — full history including losers. */
export async function listFactsForField(args: {
  contactId?: string | null;
  organizationId?: string | null;
  fieldKey: string;
}): Promise<
  Array<{
    id: string;
    value: string;
    provider: string;
    confidence: number;
    verifiedAt: Date;
    sourceUrl: string | null;
    createdAt: Date;
  }>
> {
  if (!args.contactId && !args.organizationId) {
    throw new Error(
      "listFactsForField: contactId of organizationId is verplicht",
    );
  }
  const condition = args.contactId
    ? eq(crmEnrichmentFacts.contactId, args.contactId)
    : eq(crmEnrichmentFacts.organizationId, args.organizationId!);
  const rows = await db
    .select({
      id: crmEnrichmentFacts.id,
      value: crmEnrichmentFacts.value,
      provider: crmEnrichmentFacts.provider,
      confidence: crmEnrichmentFacts.confidence,
      verifiedAt: crmEnrichmentFacts.verifiedAt,
      sourceUrl: crmEnrichmentFacts.sourceUrl,
      createdAt: crmEnrichmentFacts.createdAt,
    })
    .from(crmEnrichmentFacts)
    .where(
      and(condition, eq(crmEnrichmentFacts.fieldKey, args.fieldKey)),
    );
  return rows.map((r) => ({
    id: r.id,
    value: r.value,
    provider: r.provider,
    confidence: r.confidence,
    verifiedAt: r.verifiedAt,
    sourceUrl: r.sourceUrl,
    createdAt: r.createdAt,
  }));
}

// Re-export helpers for callers that want to compose typed queries.
export { isNotNull };
