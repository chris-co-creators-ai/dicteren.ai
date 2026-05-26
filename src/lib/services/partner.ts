// Dicteren.ai — Partner-organisatie service
// Centraal: alle queries en mutations voor de maatschappelijke outreach
// pipeline. Admin gebruikt /admin/partners en /admin/partners/[id].
// Een partner_organization krijgt optioneel één license van type=partner,
// gedeeld door alle leden van die organisatie. Code = enige identifier,
// geen userId-koppeling bij activatie (anoniem).

import "server-only";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  devices,
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

/** Volgende externalId in reeks "ORG-NNN". Pakt het huidige max-nummer en
 *  telt door. Race-veilig genoeg voor admin-werk; voor bulk-import niet
 *  geschikt — daar wordt batch-generatie gebruikt. */
async function nextExternalId(): Promise<string> {
  const rows = await db
    .select({ externalId: partnerOrganizations.externalId })
    .from(partnerOrganizations);
  let max = 0;
  for (const r of rows) {
    const m = /^ORG-(\d+)$/.exec(r.externalId);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return `ORG-${String(max + 1).padStart(3, "0")}`;
}

export type CreatePartnerOrgArgs = {
  organizationName: string;
  segment?: string | null;
  priority?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  website?: string | null;
  decisionMaker?: string | null;
  accountOwner?: string | null;
  outreachStatus?: string | null;
  pilotStatus?: string | null;
  whyRelevant?: string | null;
  organizationType?: string | null;
  notes?: string | null;
  actorId: string | null;
  actorName?: string | null;
};

/** Maak één nieuwe partner-organisatie. Default: account-owner = actor-naam,
 *  outreachStatus = "Nieuw", pilotStatus = "Nog niet gestart". */
export async function createPartnerOrg(args: CreatePartnerOrgArgs) {
  const externalId = await nextExternalId();
  const [row] = await db
    .insert(partnerOrganizations)
    .values({
      externalId,
      organizationName: args.organizationName.trim(),
      segment: args.segment ?? null,
      priority: args.priority ?? "B",
      email: args.email ?? null,
      phone: args.phone ?? null,
      city: args.city ?? null,
      website: args.website ?? null,
      decisionMaker: args.decisionMaker ?? null,
      accountOwner: args.accountOwner ?? args.actorName ?? null,
      outreachStatus: args.outreachStatus ?? "Nieuw",
      pilotStatus: args.pilotStatus ?? "Nog niet gestart",
      whyRelevant: args.whyRelevant ?? null,
      organizationType: args.organizationType ?? null,
      gdprNotes: args.notes ?? null,
    })
    .returning();

  await logEvent({
    action: "partner.created",
    entityType: "partner_organization",
    entityId: row.id,
    actorId: args.actorId,
    metadata: {
      externalId: row.externalId,
      organizationName: row.organizationName,
    },
  });
  return row;
}

/** Bulk-create vanaf CSV. Genereert sequentiële externalIds in één pass om
 *  individuele lookups te vermijden. */
export async function bulkCreatePartnerOrgs(args: {
  rows: Omit<CreatePartnerOrgArgs, "actorId" | "actorName">[];
  actorId: string | null;
  actorName: string | null;
}) {
  if (args.rows.length === 0) return { created: 0 };

  // Eenmalige base-id lookup.
  const existing = await db
    .select({ externalId: partnerOrganizations.externalId })
    .from(partnerOrganizations);
  let max = 0;
  for (const r of existing) {
    const m = /^ORG-(\d+)$/.exec(r.externalId);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }

  const values = args.rows.map((r, i) => ({
    externalId: `ORG-${String(max + 1 + i).padStart(3, "0")}`,
    organizationName: r.organizationName.trim(),
    segment: r.segment ?? null,
    priority: r.priority ?? "B",
    email: r.email ?? null,
    phone: r.phone ?? null,
    city: r.city ?? null,
    website: r.website ?? null,
    decisionMaker: r.decisionMaker ?? null,
    accountOwner: r.accountOwner ?? args.actorName ?? null,
    outreachStatus: r.outreachStatus ?? "Nieuw",
    pilotStatus: r.pilotStatus ?? "Nog niet gestart",
    whyRelevant: r.whyRelevant ?? null,
    organizationType: r.organizationType ?? null,
    gdprNotes: r.notes ?? null,
  }));

  const inserted = await db
    .insert(partnerOrganizations)
    .values(values)
    .returning({ id: partnerOrganizations.id });

  await logEvent({
    action: "partner.bulk_created",
    entityType: "partner_organization",
    entityId: "bulk",
    actorId: args.actorId,
    metadata: { count: inserted.length },
  });
  return { created: inserted.length };
}

/** Soft delete: zet pilot/outreach naar "Afgewezen". Echte delete laten we
 *  links omdat license-data verloren zou gaan. */
export async function archivePartnerOrg(id: string, actorId: string | null) {
  const [row] = await db
    .update(partnerOrganizations)
    .set({
      outreachStatus: "Afgewezen",
      updatedAt: new Date(),
    })
    .where(eq(partnerOrganizations.id, id))
    .returning();
  if (row) {
    await logEvent({
      action: "partner.archived",
      entityType: "partner_organization",
      entityId: id,
      actorId,
    });
  }
  return row ?? null;
}

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

/** Aantal partner-orgs per outreach-status + totalen voor KPI-cards. */
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

  // Totaal aantal activaties via álle partner-licenses (ooit + nu).
  const [allActivations] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) FILTER (WHERE ${licenseActivations.isActive} = true)::int`,
    })
    .from(licenseActivations)
    .innerJoin(licenses, eq(licenses.id, licenseActivations.licenseId))
    .where(eq(licenses.type, "partner"));

  // Activaties laatste 7 + 30 dagen via partner-licenses.
  const [recent] = await db
    .select({
      last7: sql<number>`count(*) FILTER (WHERE ${licenseActivations.activatedAt} >= now() - interval '7 days')::int`,
      last30: sql<number>`count(*) FILTER (WHERE ${licenseActivations.activatedAt} >= now() - interval '30 days')::int`,
    })
    .from(licenseActivations)
    .innerJoin(licenses, eq(licenses.id, licenseActivations.licenseId))
    .where(eq(licenses.type, "partner"));

  return {
    total,
    perStatus: counts,
    activeCodes: activeLicensesRow?.count ?? 0,
    totalActivations: allActivations?.total ?? 0,
    activeActivations: allActivations?.active ?? 0,
    last7DaysActivations: recent?.last7 ?? 0,
    last30DaysActivations: recent?.last30 ?? 0,
  };
}

export type PartnerActivationStats = {
  totalActivations: number;
  activeNow: number;
  uniqueDevices: number;
  firstActivatedAt: string | null;
  lastActivatedAt: string | null;
  last7Days: number;
  last30Days: number;
  byPlatform: Record<string, number>;
  activationsByDay: { date: string; count: number }[];
  activationLimit: number;
  usagePercentage: number;
};

/** Detail-statistieken voor één partner-organisatie. */
export async function getPartnerActivationStats(
  orgId: string,
): Promise<PartnerActivationStats | null> {
  const [org] = await db
    .select({ licenseId: partnerOrganizations.licenseId })
    .from(partnerOrganizations)
    .where(eq(partnerOrganizations.id, orgId))
    .limit(1);
  if (!org?.licenseId) return null;

  const [license] = await db
    .select({
      seats: licenses.seats,
      maxActivationsPerSeat: licenses.maxActivationsPerSeat,
    })
    .from(licenses)
    .where(eq(licenses.id, org.licenseId))
    .limit(1);
  if (!license) return null;

  const limit = license.seats * license.maxActivationsPerSeat;

  // Aggregaat-rij.
  const [agg] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) FILTER (WHERE ${licenseActivations.isActive} = true)::int`,
      uniqueDevices: sql<number>`count(DISTINCT ${licenseActivations.deviceId})::int`,
      first: sql<Date | null>`min(${licenseActivations.activatedAt})`,
      last: sql<Date | null>`max(${licenseActivations.activatedAt})`,
      last7: sql<number>`count(*) FILTER (WHERE ${licenseActivations.activatedAt} >= now() - interval '7 days')::int`,
      last30: sql<number>`count(*) FILTER (WHERE ${licenseActivations.activatedAt} >= now() - interval '30 days')::int`,
    })
    .from(licenseActivations)
    .where(eq(licenseActivations.licenseId, org.licenseId));

  // Per platform.
  const platformRows = await db
    .select({
      platform: devices.platform,
      n: count(),
    })
    .from(licenseActivations)
    .innerJoin(devices, eq(devices.id, licenseActivations.deviceId))
    .where(eq(licenseActivations.licenseId, org.licenseId))
    .groupBy(devices.platform);
  const byPlatform: Record<string, number> = {};
  for (const r of platformRows) byPlatform[r.platform ?? "onbekend"] = Number(r.n);

  // Daily series laatste 30 dagen, fill gaps.
  const dailyRows = await db
    .select({
      day: sql<string>`to_char(${licenseActivations.activatedAt}, 'YYYY-MM-DD')`,
      n: count(),
    })
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.licenseId, org.licenseId),
        gte(
          licenseActivations.activatedAt,
          sql`now() - interval '30 days'`,
        ),
      ),
    )
    .groupBy(sql`to_char(${licenseActivations.activatedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${licenseActivations.activatedAt}, 'YYYY-MM-DD')`);

  const byDay = new Map(dailyRows.map((r) => [r.day, Number(r.n)]));
  const activationsByDay: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    activationsByDay.push({ date: key, count: byDay.get(key) ?? 0 });
  }

  const total = Number(agg?.total ?? 0);

  return {
    totalActivations: total,
    activeNow: Number(agg?.active ?? 0),
    uniqueDevices: Number(agg?.uniqueDevices ?? 0),
    firstActivatedAt: agg?.first ? new Date(agg.first).toISOString() : null,
    lastActivatedAt: agg?.last ? new Date(agg.last).toISOString() : null,
    last7Days: Number(agg?.last7 ?? 0),
    last30Days: Number(agg?.last30 ?? 0),
    byPlatform,
    activationsByDay,
    activationLimit: limit,
    usagePercentage: limit > 0 ? Math.round((total / limit) * 100) : 0,
  };
}
