import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts, crmOrganizations, crmEvents, leadListMembers } from "@/lib/db/schema";

// Dicteren.ai — Clay → CRM prospect-import (MCP-callable).
//
// De GTM-engineer bouwt lijsten in Clay en pusht ze hierheen (via MCP/REST). Het
// contract gebruikt ONZE veldnamen; de Clay-agent mapt Clay-kolommen daarop. Alle
// niet-herkende velden landen in `enrichment` (jsonb) zodat niets verloren gaat.
// Idempotent op (organizationId, lower(email)) — re-import verrijkt i.p.v. dupliceert.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PLACEHOLDER_ORG = "Onbekende organisatie";

export type EnrichedProspectRow = {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  seniority?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  city?: string | null;
  country?: string | null;
  emailStatus?: string | null;
  company?: string | null;
  companyDomain?: string | null;
  companyLinkedinUrl?: string | null;
  niche?: string | null;
  industry?: string | null;
  companySizeRange?: string | null;
  employeeCount?: number | null;
  revenueRange?: string | null;
  foundedYear?: number | null;
  techStack?: string[] | null;
  keywords?: string[] | null;
  followersLinkedin?: number | null;
  followersInstagram?: number | null;
  followersFacebook?: number | null;
  followersYoutube?: number | null;
  followersSubstack?: number | null;
  followersOwn?: number | null;
  leadScore?: number | null;
  temperature?: "cold" | "lukewarm" | "warm" | "hot" | null;
  notes?: string | null;
  /** Alle overige Clay-kolommen — gaan naar de jsonb catch-all. */
  extra?: Record<string, unknown> | null;
};

export type ImportOpts = {
  actorUserId: string;
  /** Direct toewijzen aan een AM (anders blijft het in de admin-pool). */
  assignToUserId?: string | null;
  /** Direct in een lead-lijst plaatsen. */
  listId?: string | null;
  /** Bron-label voor provenance. */
  source?: string;
};

function num(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

function sumReach(r: EnrichedProspectRow): number | null {
  const vals = [
    r.followersLinkedin,
    r.followersInstagram,
    r.followersFacebook,
    r.followersYoutube,
    r.followersSubstack,
    r.followersOwn,
  ]
    .map(num)
    .filter((n): n is number => n !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

async function findOrCreateOrg(
  companyName: string | null,
  accountOwnerId: string | null,
): Promise<string> {
  const name = (companyName?.trim() || PLACEHOLDER_ORG).slice(0, 200);
  const [existing] = await db
    .select({ id: crmOrganizations.id })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.name, name))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(crmOrganizations)
    .values({
      name,
      source: "csv_import",
      status: "lead",
      accountOwnerId,
    })
    .returning({ id: crmOrganizations.id });
  return created.id;
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { email: string; error: string }[];
  contactIds: string[];
};

/** Bulk-import van verrijkte prospects. Per rij: org find-or-create, contact
 *  upsert met alle velden, total_reach berekend, extras in jsonb, optioneel
 *  toegewezen aan een AM en/of in een lead-lijst. */
export async function importEnrichedProspects(
  rows: EnrichedProspectRow[],
  opts: ImportOpts,
): Promise<ImportResult> {
  const res: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [], contactIds: [] };
  const assignTo = opts.assignToUserId ?? null;

  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      res.skipped++;
      res.errors.push({ email: row.email ?? "(leeg)", error: "ongeldig e-mailadres" });
      continue;
    }

    try {
      // Org-owner = de toegewezen AM (zodat de hele org-context meegaat), anders pool.
      const orgId = await findOrCreateOrg(row.company ?? null, assignTo);

      const fullName =
        [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || email;
      const fields = {
        name: row.name ?? fullName,
        phone: row.phone ?? null,
        notes: row.notes ?? null,
        assignedToUserId: assignTo,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        jobTitle: row.jobTitle ?? null,
        seniority: row.seniority ?? null,
        department: row.department ?? null,
        linkedinUrl: row.linkedinUrl ?? null,
        twitterUrl: row.twitterUrl ?? null,
        city: row.city ?? null,
        country: row.country ?? null,
        emailStatus: row.emailStatus ?? null,
        companyName: row.company ?? null,
        companyDomain: row.companyDomain ?? null,
        companyLinkedinUrl: row.companyLinkedinUrl ?? null,
        niche: row.niche ?? null,
        industry: row.industry ?? null,
        companySizeRange: row.companySizeRange ?? null,
        employeeCount: num(row.employeeCount),
        revenueRange: row.revenueRange ?? null,
        foundedYear: num(row.foundedYear),
        techStack: row.techStack ?? null,
        keywords: row.keywords ?? null,
        followersLinkedin: num(row.followersLinkedin),
        followersInstagram: num(row.followersInstagram),
        followersFacebook: num(row.followersFacebook),
        followersYoutube: num(row.followersYoutube),
        followersSubstack: num(row.followersSubstack),
        followersOwn: num(row.followersOwn),
        totalReach: sumReach(row),
        leadScore: num(row.leadScore),
        temperature: row.temperature ?? null,
        enrichmentSource: opts.source ?? "clay",
        enrichedAt: new Date(),
        enrichment: row.extra ?? null,
        updatedAt: new Date(),
      };

      const [existing] = await db
        .select({ id: crmContacts.id })
        .from(crmContacts)
        .where(and(eq(crmContacts.crmOrganizationId, orgId), eq(crmContacts.email, email)))
        .limit(1);

      let contactId: string;
      if (existing) {
        await db.update(crmContacts).set(fields).where(eq(crmContacts.id, existing.id));
        contactId = existing.id;
        res.updated++;
      } else {
        const [ins] = await db
          .insert(crmContacts)
          .values({ crmOrganizationId: orgId, email, ...fields })
          .returning({ id: crmContacts.id });
        contactId = ins.id;
        res.created++;
        await db.insert(crmEvents).values({
          crmOrganizationId: orgId,
          crmContactId: contactId,
          actorUserId: opts.actorUserId,
          kind: "contact_added",
          payload: { via: "clay-import", source: opts.source ?? "clay" },
        });
      }

      // Optioneel in een lead-lijst plaatsen (idempotent).
      if (opts.listId) {
        await db
          .insert(leadListMembers)
          .values({ listId: opts.listId, crmContactId: contactId, addedByUserId: opts.actorUserId })
          .onConflictDoNothing();
      }

      res.contactIds.push(contactId);
    } catch (err) {
      res.skipped++;
      res.errors.push({ email, error: (err as Error).message });
    }
  }

  return res;
}
