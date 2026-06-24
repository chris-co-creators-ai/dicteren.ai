// Dicteren.ai — Reseller-funnel mechanics op persoon-niveau (crm_contacts).
//
// De funnel werft losse AI-experts (crm_contacts). Deze service zet de
// funnel-state-velden (migratie 0042) en logt de timeline-events. De
// funnel-kolom wordt afgeleid uit deze velden + de org-stage; deze service
// raakt de bestaande dispositie-/stage-machinerie niet aan.
//
// Tracking-trigger: het BEZOEK aan de deck-pagina (markDeckVisited) maakt een
// lead warm, niet de mail-open (onbetrouwbaar). Zie .claude/prds/partner-onboarding.

import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliates,
  crmContacts,
  crmEvents,
  crmOrgTasks,
  crmOrganizations,
  type CrmContact,
  type Affiliate,
} from "@/lib/db/schema";
import {
  createAffiliate,
  getAffiliateById,
  getAffiliateStats,
} from "./affiliate";
import { createDiscountCodeForAffiliate } from "./discount";
import { suggestSlugFromName, validateSlugAvailable } from "./affiliateSlug";
import {
  deriveFunnelColumn,
  type FunnelColumn,
  type FunnelStateInput,
} from "./partnerFunnelShared";

type FunnelEventKind =
  | "deck_sent"
  | "deck_visited"
  | "application_received"
  | "reseller_promoted";

/** URL-veilige, niet-raadbare deck-token. */
export function generateDeckToken(): string {
  return randomBytes(18).toString("base64url");
}

/** AM-taak gekoppeld aan de org van de contact, gerouteerd naar de account-owner,
 *  zodat een door-de-prospect-getriggerde taak (zonder ingelogde actor) toch in
 *  de takenwidget van de juiste AM verschijnt. */
async function createContactAmTask(
  contact: Pick<CrmContact, "crmOrganizationId">,
  title: string,
  kind: string,
): Promise<string | null> {
  if (!contact.crmOrganizationId) return null;
  const [org] = await db
    .select({ ownerId: crmOrganizations.accountOwnerId })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, contact.crmOrganizationId))
    .limit(1);
  const [task] = await db
    .insert(crmOrgTasks)
    .values({
      crmOrganizationId: contact.crmOrganizationId,
      title,
      kind,
      createdByUserId: org?.ownerId ?? null,
    })
    .returning({ id: crmOrgTasks.id });
  return task?.id ?? null;
}

async function logContactEvent(
  contact: Pick<CrmContact, "id" | "crmOrganizationId">,
  kind: FunnelEventKind,
  payload: Record<string, unknown>,
  actorUserId: string | null,
): Promise<void> {
  await db.insert(crmEvents).values({
    crmContactId: contact.id,
    crmOrganizationId: contact.crmOrganizationId ?? null,
    actorUserId,
    kind,
    payload,
  });
}

/** Zet een deck-token als die er nog niet is. Idempotent. Return de token. */
export async function ensureDeckToken(contactId: string): Promise<string> {
  const [row] = await db
    .select({ token: crmContacts.deckToken })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (row?.token) return row.token;
  const token = generateDeckToken();
  await db
    .update(crmContacts)
    .set({ deckToken: token, updatedAt: new Date() })
    .where(and(eq(crmContacts.id, contactId), isNull(crmContacts.deckToken)));
  // Race-safe: lees terug voor het geval een parallelle call won.
  const [after] = await db
    .select({ token: crmContacts.deckToken })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  return after?.token ?? token;
}

/** Markeer dat het deck is verstuurd: deck_sent_at + token + event. Return de
 *  token voor de mail-link. */
export async function markDeckSent(
  contactId: string,
  actorUserId: string,
): Promise<{ token: string }> {
  const token = await ensureDeckToken(contactId);
  const now = new Date();
  await db
    .update(crmContacts)
    .set({ deckSentAt: now, lastChannel: "email", lastContactAt: now, updatedAt: now })
    .where(eq(crmContacts.id, contactId));
  const [contact] = await db
    .select({ id: crmContacts.id, crmOrganizationId: crmContacts.crmOrganizationId })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (contact) await logContactEvent(contact, "deck_sent", { token }, actorUserId);
  return { token };
}

/** Publieke deck-pagina: contact ophalen op token. */
export async function getContactByDeckToken(
  token: string,
): Promise<CrmContact | null> {
  if (!token) return null;
  const [row] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.deckToken, token))
    .limit(1);
  return row ?? null;
}

/** Bezoek aan de deck-pagina maakt de lead warm (het bezoek is de trigger, niet
 *  de mail-open). Eerste bezoek zet deck_visited_at + AM-taak. */
export async function markDeckVisited(token: string): Promise<void> {
  const contact = await getContactByDeckToken(token);
  if (!contact) return;
  const now = new Date();
  const firstVisit = !contact.deckVisitedAt;
  // Temperature alleen ophogen, nooit verlagen.
  const warmer =
    contact.temperature === "hot" || contact.temperature === "warm"
      ? contact.temperature
      : "warm";
  await db
    .update(crmContacts)
    .set({
      deckVisitedAt: contact.deckVisitedAt ?? now,
      temperature: warmer,
      updatedAt: now,
    })
    .where(eq(crmContacts.id, contact.id));
  if (firstVisit) {
    await logContactEvent(contact, "deck_visited", {}, null);
    await createContactAmTask(
      contact,
      `${contact.name} bekeek het partnerdeck — bel na`,
      "deck_visited",
    );
  }
}

export type ApplicationInput = {
  companyName?: string | null;
  quote?: string | null;
  quoteAuthor?: string | null;
  logoR2Key?: string | null;
  brandColor?: string | null;
  portraitR2Key?: string | null;
  introText?: string | null;
};

/** Aanmelding op de deck-pagina: applied_at + aanmeld-data + event + AM-taak. */
export async function markApplied(
  contactId: string,
  input: ApplicationInput,
): Promise<void> {
  const [contact] = await db
    .select({
      id: crmContacts.id,
      crmOrganizationId: crmContacts.crmOrganizationId,
      name: crmContacts.name,
      appliedAt: crmContacts.appliedAt,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!contact) return;
  const firstApply = !contact.appliedAt;
  const now = new Date();
  await db
    .update(crmContacts)
    .set({
      appliedAt: contact.appliedAt ?? now,
      appliedLogoR2Key: input.logoR2Key ?? null,
      appliedBrandColor: input.brandColor ?? null,
      appliedQuote: input.quote ?? null,
      appliedQuoteAuthor: input.quoteAuthor ?? null,
      appliedPortraitR2Key: input.portraitR2Key ?? null,
      appliedIntroText: input.introText ?? null,
      companyName: input.companyName ?? undefined,
      temperature: "hot",
      updatedAt: now,
    })
    .where(eq(crmContacts.id, contactId));
  // Alleen de eerste aanmelding logt + maakt de AM-taak (dedup bij dubbel).
  if (firstApply) {
    await logContactEvent(contact, "application_received", { ...input }, null);
    await createContactAmTask(
      contact,
      `${contact.name} meldde zich aan als partner. Bel voor de afspraak (commissie + korting).`,
      "application_received",
    );
  }
}

/** Kies een vrije slug uit de bedrijfsnaam. Null als alle suggesties bezet/ongeldig
 *  zijn (de AM zet 'm dan handmatig in /admin/affiliates). */
async function uniquePartnerSlug(name: string): Promise<string | null> {
  for (const cand of suggestSlugFromName(name)) {
    const v = await validateSlugAvailable(cand);
    if (v.ok) return v.slug;
  }
  return null;
}

/** Publiceer een persoon als actieve partner (= de promote). Guards: nog niet
 *  gepromoot, e-mail aanwezig. Maakt de affiliate `active`, vult de brandkit uit de
 *  aanmeld-data, zet een slug, maakt automatisch de eigen 15%-kortingscode
 *  (organization, voor het eigen bedrijf van de partner — A2-5), zet de brug en
 *  logt het event. De welkomstmail stuurt de route (met de code + dashboard-link). */
export async function promoteContactToReseller(
  contactId: string,
  actorUserId: string,
): Promise<
  { ok: true; affiliate: Affiliate } | { ok: false; error: string }
> {
  const [contact] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!contact) return { ok: false, error: "Contact niet gevonden" };
  if (contact.promotedAffiliateId)
    return { ok: false, error: "Al gepromoveerd naar een partner" };
  if (!contact.email)
    return { ok: false, error: "Contact heeft geen e-mailadres" };

  const displayName = contact.companyName || contact.name;
  const affiliate = await createAffiliate({
    name: displayName,
    contactEmail: contact.email,
    contactPhone: contact.phone ?? null,
    commissionType: "percentage",
    commissionPct: 0,
    origin: "reseller_funnel",
    internalNotes: `Gepromoveerd vanuit de partner-funnel (persoon ${contact.name}).`,
  });

  // Brandkit uit de aangeleverde + goedgekeurde aanmeld-data, plus een unieke slug.
  // Het logo (niet-publieke intake-key) wordt bij de logo-upload-flow naar een
  // publieke asset verplaatst; hier zetten we de direct beschikbare velden.
  const slug = await uniquePartnerSlug(displayName);
  await db
    .update(affiliates)
    .set({
      slug,
      displayName,
      brandColor: contact.appliedBrandColor ?? null,
      welcomeMessage: contact.appliedQuote ?? null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(affiliates.id, affiliate.id));

  // Eigen 15%-kortingscode voor de zakelijke licenties van het eigen bedrijf.
  await createDiscountCodeForAffiliate({
    affiliateId: affiliate.id,
    affiliateName: displayName,
    type: "percentage",
    value: 15,
    appliesTo: "organization",
  });

  await db
    .update(crmContacts)
    .set({ promotedAffiliateId: affiliate.id, updatedAt: new Date() })
    .where(
      and(
        eq(crmContacts.id, contactId),
        isNull(crmContacts.promotedAffiliateId),
      ),
    );

  await logContactEvent(
    { id: contact.id, crmOrganizationId: contact.crmOrganizationId },
    "reseller_promoted",
    { affiliateId: affiliate.id, slug },
    actorUserId,
  );

  const refreshed = await getAffiliateById(affiliate.id);
  return { ok: true, affiliate: refreshed ?? affiliate };
}

export type FunnelStats = {
  referralCount: number;
  convertedCount: number;
  commissionCents: number;
};

/** De volledige funnel-state voor de cockpit: alle stage-/sub-status-velden + de
 *  afgeleide kolom + de stats (stage 7). De cockpit roept hierop de pure laag aan
 *  (deriveFunnelColumn / buildFunnelChecklist / funnelNowZone). */
export type FunnelState = FunnelStateInput & {
  contactId: string;
  column: FunnelColumn;
  deckToken: string | null;
  companyName: string | null;
  stats: FunnelStats | null;
};

/** @deprecated gebruik FunnelState. Alias voor bestaande imports. */
export type OrgFunnelState = FunnelState;

// De kolommen die de volledige funnel-state voeden. Eén plek, gedeeld door beide getters.
const funnelContactCols = {
  id: crmContacts.id,
  crmOrganizationId: crmContacts.crmOrganizationId,
  isPrimary: crmContacts.isPrimary,
  deckToken: crmContacts.deckToken,
  deckSentAt: crmContacts.deckSentAt,
  deckVisitedAt: crmContacts.deckVisitedAt,
  appliedAt: crmContacts.appliedAt,
  appliedLogoR2Key: crmContacts.appliedLogoR2Key,
  appliedBrandColor: crmContacts.appliedBrandColor,
  appliedQuote: crmContacts.appliedQuote,
  commissionDiscussedAt: crmContacts.commissionDiscussedAt,
  discountAgreedAt: crmContacts.discountAgreedAt,
  expectedClientsLoggedAt: crmContacts.expectedClientsLoggedAt,
  brandIdentityApprovedAt: crmContacts.brandIdentityApprovedAt,
  promotedAffiliateId: crmContacts.promotedAffiliateId,
  companyName: crmContacts.companyName,
  temperature: crmContacts.temperature,
  lastContactAt: crmContacts.lastContactAt,
};

type FunnelContactRow = {
  id: string;
  crmOrganizationId: string | null;
  isPrimary: boolean;
  deckToken: string | null;
  deckSentAt: Date | null;
  deckVisitedAt: Date | null;
  appliedAt: Date | null;
  appliedLogoR2Key: string | null;
  appliedBrandColor: string | null;
  appliedQuote: string | null;
  commissionDiscussedAt: Date | null;
  discountAgreedAt: Date | null;
  expectedClientsLoggedAt: Date | null;
  brandIdentityApprovedAt: Date | null;
  promotedAffiliateId: string | null;
  companyName: string | null;
  temperature: "cold" | "lukewarm" | "warm" | "hot" | null;
  lastContactAt: Date | null;
};

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** Bouw de funnel-state uit een contact-rij + de org-status + de stats. De kolom is
 *  afgeleid (deriveFunnelColumn); de cockpit krijgt alle ruwe velden mee. */
function buildFunnelState(
  c: FunnelContactRow,
  orgStatus: string | null,
  doNotCall: boolean,
  stats: FunnelStats | null,
): FunnelState {
  const input: FunnelStateInput = {
    deckSentAt: iso(c.deckSentAt),
    deckVisitedAt: iso(c.deckVisitedAt),
    appliedAt: iso(c.appliedAt),
    commissionDiscussedAt: iso(c.commissionDiscussedAt),
    discountAgreedAt: iso(c.discountAgreedAt),
    expectedClientsLoggedAt: iso(c.expectedClientsLoggedAt),
    brandIdentityApprovedAt: iso(c.brandIdentityApprovedAt),
    promotedAffiliateId: c.promotedAffiliateId,
    orgStatus,
    doNotCall,
    temperature: c.temperature,
    lastContactAt: iso(c.lastContactAt),
    appliedLogoR2Key: c.appliedLogoR2Key,
    appliedBrandColor: c.appliedBrandColor,
    appliedQuote: c.appliedQuote,
  };
  return {
    ...input,
    contactId: c.id,
    column: deriveFunnelColumn(input),
    deckToken: c.deckToken,
    companyName: c.companyName,
    stats,
  };
}

/** Stats van de gepromote affiliate (stage 7). Null als nog niet gepromoot. */
async function funnelStatsFor(
  affiliateId: string | null,
): Promise<FunnelStats | null> {
  if (!affiliateId) return null;
  const s = await getAffiliateStats(affiliateId);
  return {
    referralCount: s.referralCount,
    convertedCount: s.convertedCount,
    commissionCents: s.pendingCents + s.payableCents + s.paidCents,
  };
}

/** Funnel-state voor het CRM-org-side-panel. De prospect opent het org-panel;
 *  de funnel-velden leven op de primary contact van die org. */
export async function getOrgFunnelState(
  orgId: string,
): Promise<OrgFunnelState | null> {
  const [org] = await db
    .select({
      status: crmOrganizations.status,
      doNotCall: crmOrganizations.doNotCall,
    })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, orgId))
    .limit(1);
  if (!org) return null;

  const contacts = await db
    .select(funnelContactCols)
    .from(crmContacts)
    .where(eq(crmContacts.crmOrganizationId, orgId));
  if (!contacts.length) return null;
  const c = contacts.find((x) => x.isPrimary) ?? contacts[0];
  const stats = await funnelStatsFor(c.promotedAffiliateId);
  return buildFunnelState(c, org.status, org.doNotCall ?? false, stats);
}

/** Funnel-state voor het persoon-side-panel. De funnel-velden leven op de
 *  contact zelf; de org-stage komt erbij voor de kolom-afleiding. */
export async function getContactFunnelState(
  contactId: string,
): Promise<FunnelState | null> {
  const [c] = await db
    .select(funnelContactCols)
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!c) return null;

  let orgStatus: string | null = null;
  let doNotCall = false;
  if (c.crmOrganizationId) {
    const [org] = await db
      .select({
        status: crmOrganizations.status,
        doNotCall: crmOrganizations.doNotCall,
      })
      .from(crmOrganizations)
      .where(eq(crmOrganizations.id, c.crmOrganizationId))
      .limit(1);
    orgStatus = org?.status ?? null;
    doNotCall = org?.doNotCall ?? false;
  }

  const stats = await funnelStatsFor(c.promotedAffiliateId);
  return buildFunnelState(c, orgStatus, doNotCall, stats);
}

// ───── A2: handmatige AM-markers (Afspraak rond) + brand-identity-goedkeuring ─────

export type AfspraakMarker = "commission" | "discount" | "expected_clients";

/** Zet of wis een afspraak-vinkje. Bij compleet (alle 3) een AM-taak "controleer
 *  brand identity". Idempotent. */
export async function setAfspraakMarker(
  contactId: string,
  marker: AfspraakMarker,
  value: boolean,
): Promise<void> {
  const now = new Date();
  const stamp = value ? now : null;
  const patch =
    marker === "commission"
      ? { commissionDiscussedAt: stamp }
      : marker === "discount"
        ? { discountAgreedAt: stamp }
        : { expectedClientsLoggedAt: stamp };
  await db
    .update(crmContacts)
    .set({ ...patch, updatedAt: now })
    .where(eq(crmContacts.id, contactId));
  if (!value) return;

  const [c] = await db
    .select({
      id: crmContacts.id,
      name: crmContacts.name,
      crmOrganizationId: crmContacts.crmOrganizationId,
      commissionDiscussedAt: crmContacts.commissionDiscussedAt,
      discountAgreedAt: crmContacts.discountAgreedAt,
      expectedClientsLoggedAt: crmContacts.expectedClientsLoggedAt,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!c) return;
  const compleet =
    !!c.commissionDiscussedAt &&
    !!c.discountAgreedAt &&
    !!c.expectedClientsLoggedAt;
  if (compleet) {
    await createContactAmTask(
      c,
      `Controleer de brand identity van ${c.name} en publiceer.`,
      "brand_check",
    );
  }
}

/** Keur de aangeleverde brand identity goed (de gate vóór publiceren). Zet een
 *  AM-taak "publiceer landingpagina". */
export async function approveBrandIdentity(
  contactId: string,
  actorUserId: string,
): Promise<void> {
  const now = new Date();
  await db
    .update(crmContacts)
    .set({
      brandIdentityApprovedAt: now,
      brandIdentityApprovedBy: actorUserId,
      updatedAt: now,
    })
    .where(eq(crmContacts.id, contactId));
  const [c] = await db
    .select({
      id: crmContacts.id,
      name: crmContacts.name,
      crmOrganizationId: crmContacts.crmOrganizationId,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (c) {
    await createContactAmTask(
      c,
      `Publiceer de landingpagina van ${c.name}.`,
      "publish",
    );
  }
}
