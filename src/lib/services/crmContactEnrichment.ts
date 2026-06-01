import "server-only";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema";
import { logEvent } from "@/lib/services/audit";

// Dicteren.ai — Prospect-verrijking (Clay-aligned) lezen + handmatig bewerken.
//
// De personen-feed (crmPeople) hydrateert de zichtbare prospect-pagina met deze
// velden, net zoals klanten via listCustomerFunnel worden gehydrateerd. Een AM
// kan tijdens prospecting handmatig bijwerken via het verrijking-side-panel; de
// import-route (prospectImport) vult dezelfde velden vanuit Clay.

export type ProspectEnrichment = {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  city: string | null;
  country: string | null;
  emailStatus: string | null;
  companyName: string | null;
  companyDomain: string | null;
  companyLinkedinUrl: string | null;
  niche: string | null;
  industry: string | null;
  companySizeRange: string | null;
  employeeCount: number | null;
  revenueRange: string | null;
  foundedYear: number | null;
  followersLinkedin: number | null;
  followersInstagram: number | null;
  followersFacebook: number | null;
  followersYoutube: number | null;
  followersSubstack: number | null;
  followersOwn: number | null;
  totalReach: number | null;
  leadScore: number | null;
  lastContactAt: string | null;
  lastChannel: string | null;
  touchCount: number;
  enrichmentSource: string | null;
  enrichedAt: string | null;
};

const FOLLOWER_FIELDS = [
  "followersLinkedin",
  "followersInstagram",
  "followersFacebook",
  "followersYoutube",
  "followersSubstack",
  "followersOwn",
] as const;

/** Map crm_contact-id → enrichment, voor de zichtbare prospect-pagina. */
export async function enrichmentByContact(
  contactIds: string[],
): Promise<Map<string, ProspectEnrichment>> {
  const map = new Map<string, ProspectEnrichment>();
  if (contactIds.length === 0) return map;

  const rows = await db
    .select({
      id: crmContacts.id,
      firstName: crmContacts.firstName,
      lastName: crmContacts.lastName,
      jobTitle: crmContacts.jobTitle,
      seniority: crmContacts.seniority,
      department: crmContacts.department,
      linkedinUrl: crmContacts.linkedinUrl,
      twitterUrl: crmContacts.twitterUrl,
      city: crmContacts.city,
      country: crmContacts.country,
      emailStatus: crmContacts.emailStatus,
      companyName: crmContacts.companyName,
      companyDomain: crmContacts.companyDomain,
      companyLinkedinUrl: crmContacts.companyLinkedinUrl,
      niche: crmContacts.niche,
      industry: crmContacts.industry,
      companySizeRange: crmContacts.companySizeRange,
      employeeCount: crmContacts.employeeCount,
      revenueRange: crmContacts.revenueRange,
      foundedYear: crmContacts.foundedYear,
      followersLinkedin: crmContacts.followersLinkedin,
      followersInstagram: crmContacts.followersInstagram,
      followersFacebook: crmContacts.followersFacebook,
      followersYoutube: crmContacts.followersYoutube,
      followersSubstack: crmContacts.followersSubstack,
      followersOwn: crmContacts.followersOwn,
      totalReach: crmContacts.totalReach,
      leadScore: crmContacts.leadScore,
      lastContactAt: crmContacts.lastContactAt,
      lastChannel: crmContacts.lastChannel,
      touchCount: crmContacts.touchCount,
      enrichmentSource: crmContacts.enrichmentSource,
      enrichedAt: crmContacts.enrichedAt,
    })
    .from(crmContacts)
    .where(inArray(crmContacts.id, contactIds));

  for (const r of rows) {
    map.set(r.id, {
      firstName: r.firstName,
      lastName: r.lastName,
      jobTitle: r.jobTitle,
      seniority: r.seniority,
      department: r.department,
      linkedinUrl: r.linkedinUrl,
      twitterUrl: r.twitterUrl,
      city: r.city,
      country: r.country,
      emailStatus: r.emailStatus,
      companyName: r.companyName,
      companyDomain: r.companyDomain,
      companyLinkedinUrl: r.companyLinkedinUrl,
      niche: r.niche,
      industry: r.industry,
      companySizeRange: r.companySizeRange,
      employeeCount: r.employeeCount,
      revenueRange: r.revenueRange,
      foundedYear: r.foundedYear,
      followersLinkedin: r.followersLinkedin,
      followersInstagram: r.followersInstagram,
      followersFacebook: r.followersFacebook,
      followersYoutube: r.followersYoutube,
      followersSubstack: r.followersSubstack,
      followersOwn: r.followersOwn,
      totalReach: r.totalReach,
      leadScore: r.leadScore,
      lastContactAt: r.lastContactAt?.toISOString() ?? null,
      lastChannel: r.lastChannel,
      touchCount: r.touchCount,
      enrichmentSource: r.enrichmentSource,
      enrichedAt: r.enrichedAt?.toISOString() ?? null,
    });
  }
  return map;
}

/** Velden die een AM handmatig mag bijwerken in het verrijking-panel. */
export type EnrichmentPatch = Partial<{
  jobTitle: string | null;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  city: string | null;
  country: string | null;
  companyName: string | null;
  companyDomain: string | null;
  niche: string | null;
  industry: string | null;
  companySizeRange: string | null;
  employeeCount: number | null;
  revenueRange: string | null;
  foundedYear: number | null;
  followersLinkedin: number | null;
  followersInstagram: number | null;
  followersFacebook: number | null;
  followersYoutube: number | null;
  followersSubstack: number | null;
  followersOwn: number | null;
  leadScore: number | null;
  lastChannel: string | null;
}>;

/**
 * Handmatige verrijking opslaan. Herberekent total_reach uit de som van de
 * follower-velden (bestaand + patch) en stempelt enriched_at + bron "manual".
 */
export async function updateContactEnrichment(args: {
  contactId: string;
  patch: EnrichmentPatch;
  actorUserId: string;
}): Promise<{ ok: boolean }> {
  const [current] = await db
    .select({
      followersLinkedin: crmContacts.followersLinkedin,
      followersInstagram: crmContacts.followersInstagram,
      followersFacebook: crmContacts.followersFacebook,
      followersYoutube: crmContacts.followersYoutube,
      followersSubstack: crmContacts.followersSubstack,
      followersOwn: crmContacts.followersOwn,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, args.contactId))
    .limit(1);
  if (!current) return { ok: false };

  const merged: Record<string, number | null> = { ...current };
  for (const f of FOLLOWER_FIELDS) {
    if (f in args.patch) merged[f] = args.patch[f] ?? null;
  }
  const totalReach = FOLLOWER_FIELDS.reduce(
    (sum, f) => sum + (merged[f] ?? 0),
    0,
  );

  await db
    .update(crmContacts)
    .set({
      ...args.patch,
      totalReach,
      enrichmentSource: "manual",
      enrichedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(crmContacts.id, args.contactId));

  await logEvent({
    action: "admin.action",
    entityType: "crm_contact",
    entityId: args.contactId,
    actorId: args.actorUserId,
    metadata: {
      action: "update_enrichment",
      fields: Object.keys(args.patch),
      totalReach,
    },
  });

  return { ok: true };
}
