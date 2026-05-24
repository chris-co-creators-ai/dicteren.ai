// Dicteren.ai — Partner-organisatie service
// Centraal: alle queries en mutations voor de maatschappelijke outreach
// pipeline. Admin gebruikt /admin/partners en /admin/partners/[id].
// Een partner_organization krijgt optioneel één license van type=partner,
// gedeeld door alle leden van die organisatie. Code = enige identifier,
// geen userId-koppeling bij activatie (anoniem).

import "server-only";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licenseActivations,
  licenses,
  partnerOrganizations,
  type PartnerOrganization,
} from "@/lib/db/schema";
import { generatePartnerCode, hashLicenseCode } from "./license";
import { logEvent } from "./audit";

export type PartnerOrgListItem = Pick<
  PartnerOrganization,
  | "id"
  | "externalId"
  | "organizationName"
  | "priority"
  | "segment"
  | "outreachStatus"
  | "pilotStatus"
  | "email"
  | "city"
  | "accountOwner"
  | "followUpDate"
  | "freeCodesCount"
  | "licenseId"
> & {
  partnerCode: string | null;
  licenseStatus: string | null;
  activeActivations: number;
};

/** Lijst alle partner-orgs voor /admin/partners. Sortering: prioriteit (A→C), dan naam. */
export async function listPartnerOrgs(): Promise<PartnerOrgListItem[]> {
  const rows = await db
    .select({
      id: partnerOrganizations.id,
      externalId: partnerOrganizations.externalId,
      organizationName: partnerOrganizations.organizationName,
      priority: partnerOrganizations.priority,
      segment: partnerOrganizations.segment,
      outreachStatus: partnerOrganizations.outreachStatus,
      pilotStatus: partnerOrganizations.pilotStatus,
      email: partnerOrganizations.email,
      city: partnerOrganizations.city,
      accountOwner: partnerOrganizations.accountOwner,
      followUpDate: partnerOrganizations.followUpDate,
      freeCodesCount: partnerOrganizations.freeCodesCount,
      licenseId: partnerOrganizations.licenseId,
      partnerCode: licenses.code,
      licenseStatus: licenses.status,
    })
    .from(partnerOrganizations)
    .leftJoin(licenses, eq(licenses.id, partnerOrganizations.licenseId))
    .orderBy(partnerOrganizations.priority, partnerOrganizations.externalId);

  if (rows.length === 0) return [];

  const licenseIds = rows.map((r) => r.licenseId).filter((id): id is string => Boolean(id));
  const activations = licenseIds.length
    ? await db
        .select({
          licenseId: licenseActivations.licenseId,
          count: sql<number>`count(*)::int`,
        })
        .from(licenseActivations)
        .where(
          and(
            eq(licenseActivations.isActive, true),
            sql`${licenseActivations.licenseId} IN ${licenseIds}`,
          ),
        )
        .groupBy(licenseActivations.licenseId)
    : [];

  const activeByLicense = new Map<string, number>();
  for (const a of activations) activeByLicense.set(a.licenseId, a.count);

  return rows.map((r) => ({
    ...r,
    activeActivations: r.licenseId
      ? activeByLicense.get(r.licenseId) ?? 0
      : 0,
  }));
}

/** Volledige partner-org + license + activations voor detail-view. */
export async function getPartnerOrg(id: string) {
  const [org] = await db
    .select()
    .from(partnerOrganizations)
    .where(eq(partnerOrganizations.id, id))
    .limit(1);
  if (!org) return null;

  const license = org.licenseId
    ? (
        await db
          .select()
          .from(licenses)
          .where(eq(licenses.id, org.licenseId))
          .limit(1)
      )[0] ?? null
    : null;

  const activations = license
    ? await db
        .select()
        .from(licenseActivations)
        .where(eq(licenseActivations.licenseId, license.id))
        .orderBy(desc(licenseActivations.activatedAt))
    : [];

  return { org, license, activations };
}

export type PartnerOrgPatch = Partial<
  Omit<
    PartnerOrganization,
    "id" | "externalId" | "licenseId" | "createdAt" | "updatedAt"
  >
>;

/** Admin update editable velden. external_id en license-relatie blijven uit dit pad. */
export async function updatePartnerOrg(
  id: string,
  patch: PartnerOrgPatch,
  actorId: string | null,
) {
  const [updated] = await db
    .update(partnerOrganizations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(partnerOrganizations.id, id))
    .returning();

  if (updated) {
    await logEvent({
      action: "partner.updated",
      entityType: "partner_organization",
      entityId: id,
      actorId,
      metadata: { patchKeys: Object.keys(patch) },
    });
  }

  return updated ?? null;
}

/** Genereer een partner-code en koppel aan deze org. Idempotent: als licenseId al
 *  bestaat, returnt de bestaande license ipv duplicate aan te maken. */
export async function issuePartnerCode(args: {
  partnerOrgId: string;
  seats: number;
  expiresAt: Date | null;
  actorId: string | null;
}) {
  const { partnerOrgId, seats, expiresAt, actorId } = args;

  const [org] = await db
    .select()
    .from(partnerOrganizations)
    .where(eq(partnerOrganizations.id, partnerOrgId))
    .limit(1);
  if (!org) return { success: false as const, error: "Organisatie niet gevonden" };

  if (org.licenseId) {
    const [existing] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, org.licenseId))
      .limit(1);
    if (existing) {
      return { success: true as const, license: existing, isExisting: true };
    }
  }

  // Generate unique code (retry on hash collision — astronomically unlikely).
  let code: string;
  let codeHash: string;
  let attempts = 0;
  while (true) {
    code = generatePartnerCode();
    codeHash = hashLicenseCode(code);
    const [clash] = await db
      .select({ id: licenses.id })
      .from(licenses)
      .where(eq(licenses.codeHash, codeHash))
      .limit(1);
    if (!clash) break;
    if (++attempts > 5) {
      return { success: false as const, error: "Codegeneratie mislukt" };
    }
  }

  const [license] = await db
    .insert(licenses)
    .values({
      code,
      codeHash,
      type: "partner",
      status: "active",
      seats,
      maxActivationsPerSeat: 1,
      issuedAt: new Date(),
      expiresAt,
      notes: `Partner-code voor ${org.organizationName}`,
    })
    .returning();

  const [updatedOrg] = await db
    .update(partnerOrganizations)
    .set({
      licenseId: license.id,
      freeCodesCount: seats,
      pilotStatus: org.pilotStatus === "Nog niet gestart" ? "Live" : org.pilotStatus,
      updatedAt: new Date(),
    })
    .where(eq(partnerOrganizations.id, partnerOrgId))
    .returning();

  await logEvent({
    action: "partner.code_issued",
    entityType: "partner_organization",
    entityId: partnerOrgId,
    actorId,
    metadata: {
      licenseId: license.id,
      code: license.code,
      seats,
      expiresAt: expiresAt?.toISOString() ?? null,
    },
  });

  return { success: true as const, license, isExisting: false, org: updatedOrg };
}

/** Aantal partner-orgs per outreach-status voor KPI-cards. */
export async function partnerOrgsKpis() {
  const rows = await db
    .select({
      outreachStatus: partnerOrganizations.outreachStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(partnerOrganizations)
    .groupBy(partnerOrganizations.outreachStatus);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    counts[r.outreachStatus ?? "Nieuw"] = r.count;
    total += r.count;
  }

  const [activeLicensesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(licenses)
    .where(and(eq(licenses.type, "partner"), eq(licenses.status, "active")));

  return {
    total,
    perStatus: counts,
    activeCodes: activeLicensesRow?.count ?? 0,
  };
}
