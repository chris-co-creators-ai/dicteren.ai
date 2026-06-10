// Dicteren.ai — Reseller-onboarding-flow (PRD: .claude/prds/crm-reseller-flow).
//
// Mechanics voor het reseller-traject op een CRM-org: de configureerbare
// onboarding-checklist, org-documenten (R2) en de promotie naar een
// affiliate-account. Domeinregels (guards) zitten hier zodat elke route
// dezelfde waarheid afdwingt.

import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmOrganizations,
  crmResellerSteps,
  crmOrgAttachments,
  crmEvents,
  type CrmResellerStep,
  type CrmOrgAttachment,
} from "@/lib/db/schema";
import { getPrimaryContact } from "./crmDeals";
import { createAffiliate } from "./affiliate";
import { signUpload, signDownload, deleteObject, isR2Configured } from "./r2";

// Default-stappen bij de start van een reseller-traject. De AM mag ze daarna
// volledig herindelen; dit is alleen het startpunt.
export const DEFAULT_RESELLER_STEPS: string[] = [
  "Partnerdeck versturen",
  "Meeting boeken",
  "Kennismakingsgesprek houden",
  "Samenwerking documenteren",
  "Document delen met reseller + opslaan als bijlage",
  "Commissie bepalen (% + recurring)",
  "Verwachte potentiële klanten vastleggen",
];

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB, zelfde limiet als docs elders

// ───── Stappen ─────

/** Lijst stappen; seedt de defaults eenmalig zodra de org op reseller staat
 *  en er nog geen stappen zijn (idempotent). */
export async function listResellerSteps(
  orgId: string,
): Promise<CrmResellerStep[]> {
  const existing = await db
    .select()
    .from(crmResellerSteps)
    .where(eq(crmResellerSteps.crmOrganizationId, orgId))
    .orderBy(asc(crmResellerSteps.position), asc(crmResellerSteps.createdAt));
  if (existing.length > 0) return existing;

  const [org] = await db
    .select({ status: crmOrganizations.status })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, orgId))
    .limit(1);
  if (!org || org.status !== "reseller") return [];

  await db.insert(crmResellerSteps).values(
    DEFAULT_RESELLER_STEPS.map((title, i) => ({
      crmOrganizationId: orgId,
      title,
      position: i,
    })),
  );
  return db
    .select()
    .from(crmResellerSteps)
    .where(eq(crmResellerSteps.crmOrganizationId, orgId))
    .orderBy(asc(crmResellerSteps.position), asc(crmResellerSteps.createdAt));
}

export async function addResellerStep(args: {
  orgId: string;
  title: string;
}): Promise<CrmResellerStep> {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${crmResellerSteps.position}), -1)` })
    .from(crmResellerSteps)
    .where(eq(crmResellerSteps.crmOrganizationId, args.orgId));
  const [row] = await db
    .insert(crmResellerSteps)
    .values({
      crmOrganizationId: args.orgId,
      title: args.title,
      position: (max?.max ?? -1) + 1,
    })
    .returning();
  return row;
}

export async function updateResellerStep(args: {
  stepId: string;
  patch: { title?: string; notes?: string | null; position?: number };
}): Promise<CrmResellerStep | null> {
  const [row] = await db
    .update(crmResellerSteps)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(eq(crmResellerSteps.id, args.stepId))
    .returning();
  return row ?? null;
}

export async function toggleResellerStep(args: {
  stepId: string;
  done: boolean;
  actorUserId: string;
}): Promise<CrmResellerStep | null> {
  const [row] = await db
    .update(crmResellerSteps)
    .set({
      doneAt: args.done ? new Date() : null,
      doneByUserId: args.done ? args.actorUserId : null,
      updatedAt: new Date(),
    })
    .where(eq(crmResellerSteps.id, args.stepId))
    .returning();
  return row ?? null;
}

export async function deleteResellerStep(stepId: string): Promise<boolean> {
  const res = await db
    .delete(crmResellerSteps)
    .where(eq(crmResellerSteps.id, stepId))
    .returning({ id: crmResellerSteps.id });
  return res.length > 0;
}

// ───── Bijlagen ─────

export async function signOrgAttachmentUpload(args: {
  orgId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; error: string }
> {
  if (!isR2Configured()) return { ok: false, error: "R2 niet geconfigureerd" };
  if (args.sizeBytes > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Bestand groter dan 25MB" };
  }
  const safeName = args.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const key = `crm-orgs/${args.orgId}/${crypto.randomUUID()}-${safeName}`;
  const uploadUrl = await signUpload(key, args.mimeType);
  return { ok: true, key, uploadUrl };
}

export async function addOrgAttachment(args: {
  orgId: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
}): Promise<CrmOrgAttachment> {
  const [row] = await db
    .insert(crmOrgAttachments)
    .values({
      crmOrganizationId: args.orgId,
      r2Key: args.r2Key,
      fileName: args.fileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      uploadedByUserId: args.uploadedByUserId,
    })
    .returning();
  return row;
}

export async function listOrgAttachments(
  orgId: string,
): Promise<Array<CrmOrgAttachment & { downloadUrl: string }>> {
  const rows = await db
    .select()
    .from(crmOrgAttachments)
    .where(eq(crmOrgAttachments.crmOrganizationId, orgId))
    .orderBy(desc(crmOrgAttachments.createdAt));
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      downloadUrl: await signDownload(r.r2Key),
    })),
  );
}

export async function deleteOrgAttachment(attId: string): Promise<boolean> {
  const [row] = await db
    .delete(crmOrgAttachments)
    .where(eq(crmOrgAttachments.id, attId))
    .returning();
  if (!row) return false;
  await deleteObject(row.r2Key).catch(() => undefined);
  return true;
}

// ───── Promotie naar affiliate ─────

export async function promoteToAffiliate(args: {
  orgId: string;
  actorUserId: string;
}): Promise<
  | { ok: true; affiliateId: string; code: string }
  | { ok: false; error: string }
> {
  const [org] = await db
    .select()
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, args.orgId))
    .limit(1);
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  if (org.status !== "reseller") {
    return { ok: false, error: "Organisatie staat niet op stage Reseller" };
  }
  if (org.promotedAffiliateId) {
    return { ok: false, error: "Al gepromoveerd naar een affiliate" };
  }
  const primary = await getPrimaryContact(args.orgId);
  if (!primary?.email) {
    return {
      ok: false,
      error: "Geen primaire contactpersoon met e-mailadres",
    };
  }

  const pct = org.resellerCommissionPct ? Number(org.resellerCommissionPct) : 0;
  const affiliate = await createAffiliate({
    name: org.name,
    contactEmail: primary.email,
    contactPhone: primary.phone ?? null,
    commissionType: "percentage",
    commissionPct: pct,
    internalNotes: [
      `Gepromoveerd vanuit CRM-reseller-traject (org ${org.name}).`,
      `Recurring: ${org.resellerRecurring ? "ja" : org.resellerRecurring === false ? "nee" : "niet vastgelegd"}.`,
      org.resellerExpectedClients != null
        ? `Verwachte klanten: ${org.resellerExpectedClients}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  });

  await db
    .update(crmOrganizations)
    .set({ promotedAffiliateId: affiliate.id, updatedAt: new Date() })
    .where(
      and(
        eq(crmOrganizations.id, args.orgId),
        isNull(crmOrganizations.promotedAffiliateId),
      ),
    );
  await db.insert(crmEvents).values({
    crmOrganizationId: args.orgId,
    actorUserId: args.actorUserId,
    kind: "reseller_promoted",
    payload: { affiliateId: affiliate.id, code: affiliate.code, pct },
  });

  return { ok: true, affiliateId: affiliate.id, code: affiliate.code };
}
