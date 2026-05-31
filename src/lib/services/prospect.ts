// Dicteren.ai — Prospect-toevoeging in CRM.
//
// Schrijfpad: crm_contacts + crm_organizations (find-or-create op company-naam).
// GEEN auth.user-write — een prospect heeft geen login. Pas wanneer een
// prospect zelf signed up of door admin gepromoveerd wordt komt er een
// auth.user-rij bij, gekoppeld via crm_contacts.authUserId.
//
// Pipedrive-pattern: Person (contact) ≠ User (loginable). Strikt gescheiden.

import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmContacts,
  crmEvents,
  crmOrganizations,
} from "@/lib/db/schema/crmDeals";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_ORG_NAME = "Onbekende organisatie";

export type ProspectInput = {
  email: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
  assignedToUserId?: string | null;
  /** Legacy stage-veld uit oude UI. Wordt mapped naar crm_organizations.status */
  stage?:
    | "lead"
    | "prospect"
    | "mql"
    | "sql"
    | "customer"
    | "lost"
    | "churned"
    | null;
  temperature?: "cold" | "lukewarm" | "warm" | "hot" | null;
  customFields?: Record<string, string | number | null> | null;
};

export type ProspectImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  rows: Array<{
    email: string;
    status: "created" | "updated" | "skipped";
    contactId?: string;
    organizationId?: string;
    reason?: string;
  }>;
};

const SOURCE_MAP: Record<
  string,
  "am_outreach" | "self_service" | "consumer_upgrade" | "csv_import" | "lead_form"
> = {
  manual: "am_outreach",
  "manual-inline": "am_outreach",
  "csv-import": "csv_import",
  lead_form: "lead_form",
};

const STAGE_MAP: Record<string, "lead" | "contacted" | "qualified" | "negotiating" | "won" | "lost"> = {
  lead: "lead",
  prospect: "lead",
  mql: "qualified",
  sql: "qualified",
  customer: "won",
  lost: "lost",
  churned: "lost",
};

function deriveOrgSource(input?: string | null) {
  if (!input) return "am_outreach" as const;
  return SOURCE_MAP[input] ?? "am_outreach";
}

function deriveOrgStatus(input?: string | null) {
  if (!input) return "lead" as const;
  return STAGE_MAP[input] ?? "lead";
}

/** Find of create crm_organizations rij voor deze company-naam. */
async function findOrCreateOrganization(args: {
  companyName: string | null;
  source: "am_outreach" | "self_service" | "consumer_upgrade" | "csv_import" | "lead_form";
  temperature: "cold" | "lukewarm" | "warm" | "hot" | null;
  accountOwnerId: string | null;
  status: "lead" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
}): Promise<string> {
  const name = (args.companyName?.trim() || PLACEHOLDER_ORG_NAME).slice(0, 200);

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
      source: args.source,
      status: args.status,
      temperature: args.temperature,
      accountOwnerId: args.accountOwnerId,
    })
    .returning({ id: crmOrganizations.id });
  return created.id;
}

/** Voegt een prospect toe als crm_contacts-rij onder een crm_organizations.
 *  Idempotent op (organizationId, lower(email)): bestaat de combinatie al, updaten we.
 */
export async function addProspect(args: {
  prospect: ProspectInput;
  // null = publieke flow zonder ingelogde actor (bv. partnership-aanmelding).
  // Beide FK-kolommen (account_owner_id, actor_user_id) wijzen naar auth.user,
  // dus een niet-user-id mag hier NOOIT in — anders FK-violation.
  addedByUserId: string | null;
}): Promise<{
  contactId: string;
  organizationId: string;
  status: "created" | "updated";
}> {
  const email = args.prospect.email.trim().toLowerCase();
  if (!email) throw new Error("email verplicht");
  if (!EMAIL_RE.test(email)) {
    throw new Error(`Ongeldig e-mailadres: "${args.prospect.email}"`);
  }

  const organizationId = await findOrCreateOrganization({
    companyName: args.prospect.company ?? null,
    source: deriveOrgSource(args.prospect.source),
    temperature: args.prospect.temperature ?? null,
    accountOwnerId: args.prospect.assignedToUserId ?? args.addedByUserId ?? null,
    status: deriveOrgStatus(args.prospect.stage),
  });

  const [existingContact] = await db
    .select({ id: crmContacts.id })
    .from(crmContacts)
    .where(
      and(
        eq(crmContacts.crmOrganizationId, organizationId),
        eq(crmContacts.email, email),
      ),
    )
    .limit(1);

  if (existingContact) {
    await db
      .update(crmContacts)
      .set({
        name: args.prospect.name ?? undefined,
        phone: args.prospect.phone ?? undefined,
        notes: args.prospect.notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, existingContact.id));
    return {
      contactId: existingContact.id,
      organizationId,
      status: "updated",
    };
  }

  const [inserted] = await db
    .insert(crmContacts)
    .values({
      crmOrganizationId: organizationId,
      name: args.prospect.name ?? email,
      email,
      phone: args.prospect.phone ?? null,
      notes: args.prospect.notes ?? null,
    })
    .returning({ id: crmContacts.id });

  await db.insert(crmEvents).values({
    crmOrganizationId: organizationId,
    crmContactId: inserted.id,
    actorUserId: args.addedByUserId ?? null,
    kind: "contact_added",
    payload: {
      source: deriveOrgSource(args.prospect.source),
      via: "prospect-add",
    },
  });

  return { contactId: inserted.id, organizationId, status: "created" };
}

// Org-status (sales-pipeline) terug naar de people-view stage-vocab
// (customerStage). Spiegelt STAGE_MAP zodat de Personen-tab één taal spreekt.
const ORG_STATUS_TO_STAGE: Record<
  string,
  "lead" | "prospect" | "mql" | "sql" | "customer" | "lost"
> = {
  lead: "lead",
  contacted: "prospect",
  qualified: "sql",
  proposal_sent: "sql",
  negotiating: "sql",
  won: "customer",
  lost: "lost",
};

export type CrmProspectRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  organizationId: string | null;
  crmStage: "lead" | "prospect" | "mql" | "sql" | "customer" | "lost";
  crmTemperature: "cold" | "lukewarm" | "warm" | "hot" | null;
  assignedToUserId: string | null;
  notes: string | null;
  createdAt: Date;
};

/** Prospects voor de CRM-personen-tab: crm_contacts ZONDER auth.user
 *  (die mét login komen al via listCustomerFunnel — geen dubbeling).
 *  Stage/temperatuur/owner komen van de gekoppelde organisatie. */
export async function listProspectsForCrm(): Promise<CrmProspectRow[]> {
  const rows = await db
    .select({
      id: crmContacts.id,
      name: crmContacts.name,
      email: crmContacts.email,
      phone: crmContacts.phone,
      notes: crmContacts.notes,
      createdAt: crmContacts.createdAt,
      organizationId: crmContacts.crmOrganizationId,
      orgName: crmOrganizations.name,
      orgStatus: crmOrganizations.status,
      orgTemperature: crmOrganizations.temperature,
      orgAccountOwnerId: crmOrganizations.accountOwnerId,
    })
    .from(crmContacts)
    .leftJoin(
      crmOrganizations,
      eq(crmContacts.crmOrganizationId, crmOrganizations.id),
    )
    .where(isNull(crmContacts.authUserId))
    .orderBy(desc(crmContacts.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company:
      r.orgName && r.orgName !== PLACEHOLDER_ORG_NAME ? r.orgName : null,
    organizationId: r.organizationId,
    crmStage: r.orgStatus ? ORG_STATUS_TO_STAGE[r.orgStatus] ?? "lead" : "lead",
    crmTemperature: r.orgTemperature ?? null,
    assignedToUserId: r.orgAccountOwnerId ?? null,
    notes: r.notes,
    createdAt: r.createdAt,
  }));
}

/** Bulk-import van prospects (CSV). Per rij idempotent + email-validatie. */
export async function bulkImportProspects(args: {
  prospects: ProspectInput[];
  addedByUserId: string;
}): Promise<ProspectImportResult> {
  const result: ProspectImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    total: args.prospects.length,
    rows: [],
  };
  for (const p of args.prospects) {
    if (!p.email?.trim()) {
      result.skipped += 1;
      result.rows.push({
        email: p.email ?? "(leeg)",
        status: "skipped",
        reason: "email ontbreekt",
      });
      continue;
    }
    if (!EMAIL_RE.test(p.email.trim().toLowerCase())) {
      result.skipped += 1;
      result.rows.push({
        email: p.email,
        status: "skipped",
        reason: "ongeldig e-mailadres",
      });
      continue;
    }
    try {
      const { contactId, organizationId, status } = await addProspect({
        prospect: p,
        addedByUserId: args.addedByUserId,
      });
      if (status === "created") result.created += 1;
      else result.updated += 1;
      result.rows.push({
        email: p.email,
        status,
        contactId,
        organizationId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "fout";
      result.skipped += 1;
      result.rows.push({ email: p.email, status: "skipped", reason: msg });
    }
  }
  return result;
}
