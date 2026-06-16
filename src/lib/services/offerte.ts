import "server-only";
import { desc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmOffertes, crmOrganizations, crmContacts } from "@/lib/db/schema";
import type { CrmOfferte } from "@/lib/db/schema/crmOffertes";
import type { ServiceResult } from "@/lib/types";
import { logEvent } from "./audit";
import { INVOICE_SELLER } from "./commerce";
import {
  computeOfferteTotals,
  normalizeLineItems,
  defaultValidUntil,
  DEFAULT_OFFERTE_INTRO,
  DEFAULT_OFFERTE_CLOSING,
  type OfferteLineItem,
  type OffertePeriod,
  type OfferteStatus,
  type OfferteTemplateKey,
} from "./offerteShared";

// Dicteren.ai — Offerte-service (server-only mechanics)
//
// De rekenlogica zit in offerteShared.ts (pure, client + server). Hier alleen
// het DB-werk: offertenummer genereren, opslaan met prijs-snapshot, lijsten,
// status bijwerken en de data samenstellen voor de PDF.

/** OFF-<jaar>-<0001> — oplopende teller per jaar. */
async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OFF-${year}-`;
  const rows = await db
    .select({ quoteNumber: crmOffertes.quoteNumber })
    .from(crmOffertes)
    .where(like(crmOffertes.quoteNumber, `${prefix}%`));
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.quoteNumber.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export type CreateOfferteInput = {
  orgId: string;
  seats: number;
  period: OffertePeriod;
  templateKey: OfferteTemplateKey;
  lineItems: OfferteLineItem[];
  validUntil?: string | null;
  introText?: string | null;
  closingText?: string | null;
  notes?: string | null;
  actorUserId: string;
};

export async function createOfferte(
  input: CreateOfferteInput,
): Promise<ServiceResult<CrmOfferte>> {
  const org = await db
    .select({ id: crmOrganizations.id })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, input.orgId))
    .limit(1);
  if (org.length === 0)
    return { success: false, error: "Organisatie niet gevonden" };

  const items = normalizeLineItems(input.lineItems);
  if (items.length === 0)
    return { success: false, error: "Voeg minstens één regel toe" };
  const totals = computeOfferteTotals(items);

  // Geen db.transaction op neon-http → retry bij een quote-number-botsing
  // (unieke index vangt de race af).
  for (let attempt = 0; attempt < 3; attempt++) {
    const quoteNumber = await generateQuoteNumber();
    try {
      const [row] = await db
        .insert(crmOffertes)
        .values({
          crmOrganizationId: input.orgId,
          quoteNumber,
          status: "concept",
          seats: Math.max(1, Math.floor(input.seats)),
          period: input.period,
          templateKey: input.templateKey,
          lineItems: items,
          netCents: totals.netCents,
          vatCents: totals.vatCents,
          grossCents: totals.grossCents,
          currency: "EUR",
          validUntil: input.validUntil ?? defaultValidUntil(),
          introText: input.introText?.trim() || DEFAULT_OFFERTE_INTRO,
          closingText: input.closingText?.trim() || DEFAULT_OFFERTE_CLOSING,
          notes: input.notes?.trim() || null,
          createdByUserId: input.actorUserId,
        })
        .returning();
      await logEvent({
        action: "crm_org.offerte_created",
        entityType: "crm_organization",
        entityId: input.orgId,
        actorId: input.actorUserId,
        metadata: { offerteId: row.id, quoteNumber, grossCents: totals.grossCents },
      });
      return { success: true, data: row };
    } catch (err) {
      if (attempt === 2) {
        console.warn("[offerte] create failed", err);
        return { success: false, error: "Offerte aanmaken mislukt" };
      }
    }
  }
  return { success: false, error: "Offerte aanmaken mislukt" };
}

export async function listOffertesForOrg(orgId: string): Promise<CrmOfferte[]> {
  return db
    .select()
    .from(crmOffertes)
    .where(eq(crmOffertes.crmOrganizationId, orgId))
    .orderBy(desc(crmOffertes.createdAt));
}

export async function getOfferte(id: string): Promise<CrmOfferte | null> {
  const rows = await db
    .select()
    .from(crmOffertes)
    .where(eq(crmOffertes.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateOfferteStatus(
  id: string,
  status: OfferteStatus,
  actorUserId: string,
): Promise<ServiceResult<CrmOfferte>> {
  const [row] = await db
    .update(crmOffertes)
    .set({ status, updatedAt: new Date() })
    .where(eq(crmOffertes.id, id))
    .returning();
  if (!row) return { success: false, error: "Offerte niet gevonden" };
  await logEvent({
    action: "crm_org.offerte_status_changed",
    entityType: "crm_organization",
    entityId: row.crmOrganizationId,
    actorId: actorUserId,
    metadata: { offerteId: id, status },
  });
  return { success: true, data: row };
}

export async function setOffertePdfKey(id: string, r2Key: string): Promise<void> {
  await db
    .update(crmOffertes)
    .set({ pdfR2Key: r2Key, updatedAt: new Date() })
    .where(eq(crmOffertes.id, id));
}

// ── PDF-datamodel ──────────────────────────────────────────────────────────

export type OfferteSeller = {
  name: string;
  email: string;
  website: string;
  kvk: string | null;
  vat: string | null;
  address: string | null;
};

export type OfferteBuyer = {
  name: string;
  kvk: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
};

export type OffertePdfData = {
  offerte: CrmOfferte;
  lineItems: OfferteLineItem[];
  seller: OfferteSeller;
  buyer: OfferteBuyer;
};

/** Laadt de offerte + klant + afzender voor de PDF-render. */
export async function assembleOfferteForPdf(
  id: string,
): Promise<OffertePdfData | null> {
  const offerte = await getOfferte(id);
  if (!offerte) return null;

  const orgRows = await db
    .select()
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, offerte.crmOrganizationId))
    .limit(1);
  const org = orgRows[0];
  if (!org) return null;

  const contacts = await db
    .select({
      name: crmContacts.name,
      firstName: crmContacts.firstName,
      lastName: crmContacts.lastName,
      email: crmContacts.email,
      isPrimary: crmContacts.isPrimary,
    })
    .from(crmContacts)
    .where(eq(crmContacts.crmOrganizationId, offerte.crmOrganizationId));
  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null;
  const contactName = primary
    ? [primary.firstName, primary.lastName].filter(Boolean).join(" ") ||
      primary.name
    : null;

  return {
    offerte,
    lineItems: (offerte.lineItems as OfferteLineItem[]) ?? [],
    seller: {
      name: INVOICE_SELLER.name,
      email: INVOICE_SELLER.email,
      website: INVOICE_SELLER.website,
      kvk: INVOICE_SELLER.kvk,
      vat: INVOICE_SELLER.vat,
      address: INVOICE_SELLER.address,
    },
    buyer: {
      name: org.name,
      kvk: org.kvk,
      vatNumber: org.vatNumber,
      addressLine1: org.addressLine1,
      addressLine2: org.addressLine2,
      postalCode: org.postalCode,
      city: org.city,
      contactName,
      contactEmail: primary?.email ?? null,
    },
  };
}
