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
  crmContacts,
  crmEvents,
  crmOrgTasks,
  crmOrganizations,
  type CrmContact,
  type Affiliate,
} from "@/lib/db/schema";
import { createAffiliate } from "./affiliate";
import { deriveFunnelColumn, type FunnelColumn } from "./partnerFunnelShared";

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
      appliedQuote: input.quote ?? null,
      appliedQuoteAuthor: input.quoteAuthor ?? null,
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
      `${contact.name} meldde zich aan als reseller — beoordeel + bel`,
      "application_received",
    );
  }
}

/** Promote een persoon naar een actieve reseller (affiliate). Guards: nog niet
 *  gepromoot, e-mail aanwezig. Maakt de affiliate, zet de brug, logt het event. */
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
    return { ok: false, error: "Al gepromoveerd naar een reseller" };
  if (!contact.email)
    return { ok: false, error: "Contact heeft geen e-mailadres" };

  const affiliate = await createAffiliate({
    name: contact.companyName || contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone ?? null,
    commissionType: "percentage",
    commissionPct: 0,
    internalNotes: `Gepromoveerd vanuit de reseller-funnel (persoon ${contact.name}).`,
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
    { affiliateId: affiliate.id },
    actorUserId,
  );

  return { ok: true, affiliate };
}

export type FunnelState = {
  contactId: string;
  column: FunnelColumn;
  deckToken: string | null;
  deckSentAt: string | null;
  deckVisitedAt: string | null;
  appliedAt: string | null;
  companyName: string | null;
  appliedQuote: string | null;
  promotedAffiliateId: string | null;
  temperature: "cold" | "lukewarm" | "warm" | "hot" | null;
};

/** @deprecated gebruik FunnelState. Alias voor bestaande imports. */
export type OrgFunnelState = FunnelState;

/** Bouw de funnel-state uit een contact-rij + de org-status. Gedeeld door de
 *  org-getter (primary contact) en de persoon-getter (de contact zelf). De
 *  kolom is afgeleid uit de contact-velden plus de org-stage. */
function buildFunnelState(
  c: {
    id: string;
    deckToken: string | null;
    deckSentAt: Date | null;
    deckVisitedAt: Date | null;
    appliedAt: Date | null;
    companyName: string | null;
    appliedQuote: string | null;
    promotedAffiliateId: string | null;
    temperature: "cold" | "lukewarm" | "warm" | "hot" | null;
  },
  orgStatus: string | null,
  doNotCall: boolean,
): FunnelState {
  const deckSentAt = c.deckSentAt ? c.deckSentAt.toISOString() : null;
  const deckVisitedAt = c.deckVisitedAt ? c.deckVisitedAt.toISOString() : null;
  const appliedAt = c.appliedAt ? c.appliedAt.toISOString() : null;
  const column = deriveFunnelColumn({
    deckSentAt,
    deckVisitedAt,
    appliedAt,
    promotedAffiliateId: c.promotedAffiliateId,
    temperature: c.temperature,
    orgStatus,
    doNotCall,
  });
  return {
    contactId: c.id,
    column,
    deckToken: c.deckToken,
    deckSentAt,
    deckVisitedAt,
    appliedAt,
    companyName: c.companyName,
    appliedQuote: c.appliedQuote,
    promotedAffiliateId: c.promotedAffiliateId,
    temperature: c.temperature,
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
    .select({
      id: crmContacts.id,
      isPrimary: crmContacts.isPrimary,
      deckToken: crmContacts.deckToken,
      deckSentAt: crmContacts.deckSentAt,
      deckVisitedAt: crmContacts.deckVisitedAt,
      appliedAt: crmContacts.appliedAt,
      companyName: crmContacts.companyName,
      appliedQuote: crmContacts.appliedQuote,
      promotedAffiliateId: crmContacts.promotedAffiliateId,
      temperature: crmContacts.temperature,
    })
    .from(crmContacts)
    .where(eq(crmContacts.crmOrganizationId, orgId));
  if (!contacts.length) return null;
  const c = contacts.find((x) => x.isPrimary) ?? contacts[0];
  return buildFunnelState(c, org.status, org.doNotCall ?? false);
}

/** Funnel-state voor het persoon-side-panel. De funnel-velden leven op de
 *  contact zelf; de org-stage komt erbij voor de kolom-afleiding. */
export async function getContactFunnelState(
  contactId: string,
): Promise<FunnelState | null> {
  const [c] = await db
    .select({
      id: crmContacts.id,
      crmOrganizationId: crmContacts.crmOrganizationId,
      deckToken: crmContacts.deckToken,
      deckSentAt: crmContacts.deckSentAt,
      deckVisitedAt: crmContacts.deckVisitedAt,
      appliedAt: crmContacts.appliedAt,
      companyName: crmContacts.companyName,
      appliedQuote: crmContacts.appliedQuote,
      promotedAffiliateId: crmContacts.promotedAffiliateId,
      temperature: crmContacts.temperature,
    })
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

  return buildFunnelState(c, orgStatus, doNotCall);
}
