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
  const now = new Date();
  await db
    .update(crmContacts)
    .set({
      appliedAt: now,
      appliedLogoR2Key: input.logoR2Key ?? null,
      appliedQuote: input.quote ?? null,
      appliedQuoteAuthor: input.quoteAuthor ?? null,
      companyName: input.companyName ?? undefined,
      temperature: "hot",
      updatedAt: now,
    })
    .where(eq(crmContacts.id, contactId));
  const [contact] = await db
    .select({
      id: crmContacts.id,
      crmOrganizationId: crmContacts.crmOrganizationId,
      name: crmContacts.name,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (contact) {
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
