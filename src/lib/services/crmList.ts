// Dicteren.ai — Server-side gepagineerde CRM-personenlijst.
//
// /crm is de sales-motie: deze lijst toont prospects (crm_contacts). Accounts
// (auth.user) leven in /admin/users. Een prospect die intussen een account
// aanmaakte blijft hier staan als sales-record; has_account markeert dat.
// Eén keyset-gepagineerde query met de filters als SQL-WHERE, schaalt naar
// duizenden rijen omdat alleen de zichtbare pagina (≤ limit) over de lijn gaat.
//
// Raw SQL is hier nodig: drizzle kan deze CASE-mapping + tuple-keyset niet
// typed uitdrukken. Alle user-input gaat via sql-parameters (geparametriseerd,
// niet geïnterpoleerd) zodat er geen injectie mogelijk is.

import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";

export type CrmPeopleKind = "customer" | "prospect";

export type CrmPeopleFilters = {
  kind?: CrmPeopleKind | null;
  stage?: string | null;
  temperature?: string | null;
  /** auth.user-id van de account-manager; "none" = niet-toegewezen. */
  assigneeUserId?: string | null;
  search?: string | null;
  /** lead_lists.id — toont alleen members van die lijst. */
  listId?: string | null;
  /** Harde scope-guard (los van de user-filter): een AM ziet alleen z'n
   *  toegewezen leads + de niet-toegewezen pool. null/undefined = admin (alles). */
  scopeAssignedTo?: string | null;
  /** GTM-targeting (alleen prospects hebben deze velden). */
  industry?: string | null;
  companySizeRange?: string | null;
  minScore?: number | null;
  /** Call-center: filter op laatste dispositie (org-niveau, alleen prospects). */
  disposition?: string | null;
  /** Belronde-hygiëne: verberg stage lost/churned (default in de UI). */
  excludeLost?: boolean | null;
};

export type CrmPeopleCursor = { createdAt: string; id: string };

export type CrmPeopleListRow = {
  id: string;
  kind: CrmPeopleKind;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  crmStage: string | null;
  temperature: string | null;
  assigneeId: string | null;
  notes: string | null;
  organizationId: string | null;
  createdAt: string;
  /** True zodra er een auth.user achter dit contact zit (inbound-signup gematcht). */
  hasAccount: boolean;
  /** Contactpersoon-velden (alleen prospects; klanten NULL). Migratie 0038. */
  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  roleAtCompany: string | null;
  /** Org-bedrijfsvelden voor de Personen-grid (alleen prospects met org). */
  orgKvk: string | null;
  orgVatNumber: string | null;
  orgBrancheVereniging: string | null;
  orgAantalVestigingen: number | null;
  orgHoofdkantoor: string | null;
  orgSpecialisatie: string | null;
};

/** De prospect-bron. Identiek voor de page-query en de count-query. Toont alle
 *  crm_contacts (gekoppeld aan een account of niet); has_account = true zodra er
 *  een auth.user achter zit. De 'prospect'-literal blijft staan zodat de
 *  downstream-keten (loadCrmPeoplePage, crm-view) op kind kan blijven leunen. */
const PEOPLE_CTE = sql`
  WITH people AS (
    SELECT
      c.id::text                         AS id,
      'prospect'::text                   AS kind,
      c.name                             AS name,
      c.email                            AS email,
      c.phone                            AS phone,
      CASE WHEN o.name = 'Onbekende organisatie' THEN NULL ELSE o.name END AS company,
      CASE o.status
        WHEN 'lead' THEN 'lead'
        WHEN 'contacted' THEN 'prospect'
        WHEN 'qualified' THEN 'sql'
        WHEN 'proposal_sent' THEN 'sql'
        WHEN 'negotiating' THEN 'sql'
        WHEN 'won' THEN 'customer'
        WHEN 'lost' THEN 'lost'
        WHEN 'reseller' THEN 'reseller'
        ELSE 'lead'
      END                                AS crm_stage,
      o.temperature::text                AS temperature,
      COALESCE(c.assigned_to_user_id, o.account_owner_id)::text AS assignee_id,
      c.notes                            AS notes,
      c.crm_organization_id::text        AS organization_id,
      (c.auth_user_id IS NOT NULL)       AS has_account,
      c.industry                         AS industry,
      c.company_size_range               AS company_size_range,
      c.lead_score                       AS lead_score,
      o.last_disposition                 AS last_disposition,
      c.first_name                       AS first_name,
      c.last_name                        AS last_name,
      c.mobile_phone                     AS mobile_phone,
      c.role_at_company                  AS role_at_company,
      o.kvk                              AS org_kvk,
      o.vat_number                       AS org_vat_number,
      o.branche_vereniging               AS org_branche_vereniging,
      o.aantal_vestigingen               AS org_aantal_vestigingen,
      o.hoofdkantoor                     AS org_hoofdkantoor,
      o.specialisatie                    AS org_specialisatie,
      c.created_at                       AS created_at
    FROM public.crm_contacts c
    LEFT JOIN public.crm_organizations o ON o.id = c.crm_organization_id
  )
`;

/** Bouwt de WHERE-condities uit de filters. Lege filters → geen condities. */
function buildConditions(filters: CrmPeopleFilters): SQL[] {
  const conds: SQL[] = [];
  if (filters.kind) conds.push(sql`people.kind = ${filters.kind}`);
  if (filters.stage) conds.push(sql`people.crm_stage = ${filters.stage}`);
  if (filters.temperature)
    conds.push(sql`people.temperature = ${filters.temperature}`);
  if (filters.assigneeUserId === "none") {
    conds.push(sql`people.assignee_id IS NULL`);
  } else if (filters.assigneeUserId) {
    conds.push(sql`people.assignee_id = ${filters.assigneeUserId}`);
  }
  // Harde scope-guard: AM ziet alleen eigen toegewezen + niet-toegewezen pool.
  if (filters.scopeAssignedTo) {
    conds.push(
      sql`(people.assignee_id = ${filters.scopeAssignedTo} OR people.assignee_id IS NULL)`,
    );
  }
  if (filters.search) {
    const q = `%${filters.search.trim()}%`;
    conds.push(sql`(people.name ILIKE ${q} OR people.email ILIKE ${q})`);
  }
  // GTM-targeting op prospect-verrijking.
  if (filters.industry) {
    conds.push(sql`people.industry ILIKE ${`%${filters.industry.trim()}%`}`);
  }
  if (filters.companySizeRange) {
    conds.push(sql`people.company_size_range = ${filters.companySizeRange}`);
  }
  if (typeof filters.minScore === "number") {
    conds.push(sql`people.lead_score >= ${filters.minScore}`);
  }
  if (filters.disposition === "none") {
    conds.push(sql`people.last_disposition IS NULL`);
  } else if (filters.disposition) {
    conds.push(sql`people.last_disposition = ${filters.disposition}`);
  }
  if (filters.excludeLost) {
    // NULL-stage (klant zonder attributes-rij) telt als niet-verloren.
    conds.push(
      sql`(people.crm_stage IS NULL OR people.crm_stage NOT IN ('lost', 'churned'))`,
    );
  }
  if (filters.listId) {
    conds.push(
      sql`EXISTS (SELECT 1 FROM public.lead_list_members m
                  WHERE m.list_id = ${filters.listId}
                    AND (m.user_id::text = people.id
                         OR m.crm_contact_id::text = people.id))`,
    );
  }
  return conds;
}

function whereClause(conds: SQL[]): SQL {
  if (conds.length === 0) return sql``;
  return sql` WHERE ${sql.join(conds, sql` AND `)}`;
}

/** Eén gefilterde, keyset-gepagineerde pagina personen + nextCursor. */
export async function listCrmPeoplePage(args: {
  filters?: CrmPeopleFilters;
  cursor?: CrmPeopleCursor | null;
  limit?: number;
}): Promise<{ rows: CrmPeopleListRow[]; nextCursor: CrmPeopleCursor | null }> {
  const filters = args.filters ?? {};
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const conds = buildConditions(filters);
  if (args.cursor) {
    conds.push(
      sql`(people.created_at, people.id) < (${args.cursor.createdAt}::timestamptz, ${args.cursor.id})`,
    );
  }
  const result = await db.execute<{
    id: string;
    kind: CrmPeopleKind;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    crm_stage: string | null;
    temperature: string | null;
    assignee_id: string | null;
    notes: string | null;
    organization_id: string | null;
    has_account: boolean;
    created_at: string | Date;
    first_name: string | null;
    last_name: string | null;
    mobile_phone: string | null;
    role_at_company: string | null;
    org_kvk: string | null;
    org_vat_number: string | null;
    org_branche_vereniging: string | null;
    org_aantal_vestigingen: number | null;
    org_hoofdkantoor: string | null;
    org_specialisatie: string | null;
  }>(
    sql`${PEOPLE_CTE}
        SELECT id, kind, name, email, phone, company, crm_stage, temperature, assignee_id, notes, organization_id, has_account, created_at,
               first_name, last_name, mobile_phone, role_at_company,
               org_kvk, org_vat_number, org_branche_vereniging, org_aantal_vestigingen, org_hoofdkantoor, org_specialisatie
        FROM people${whereClause(conds)}
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit + 1}`,
  );
  const list = result.rows ?? [];
  const hasMore = list.length > limit;
  const page = hasMore ? list.slice(0, limit) : list;
  const mapped: CrmPeopleListRow[] = page.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    crmStage: r.crm_stage,
    temperature: r.temperature,
    assigneeId: r.assignee_id,
    notes: r.notes,
    organizationId: r.organization_id,
    hasAccount: r.has_account,
    firstName: r.first_name,
    lastName: r.last_name,
    mobilePhone: r.mobile_phone,
    roleAtCompany: r.role_at_company,
    orgKvk: r.org_kvk,
    orgVatNumber: r.org_vat_number,
    orgBrancheVereniging: r.org_branche_vereniging,
    orgAantalVestigingen: r.org_aantal_vestigingen,
    orgHoofdkantoor: r.org_hoofdkantoor,
    orgSpecialisatie: r.org_specialisatie,
    createdAt:
      r.created_at instanceof Date
        ? (r.created_at as Date).toISOString()
        : String(r.created_at),
  }));
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? { createdAt: mapped[mapped.length - 1].createdAt, id: last.id } : null;
  return { rows: mapped, nextCursor };
}

/** Totaal-aantal voor de gegeven filters (voor "1–50 van X"). */
export async function countCrmPeople(
  filters: CrmPeopleFilters = {},
): Promise<number> {
  const conds = buildConditions(filters);
  const res = await db.execute<{ n: number }>(
    sql`${PEOPLE_CTE} SELECT count(*)::int AS n FROM people${whereClause(conds)}`,
  );
  return res.rows?.[0]?.n ?? 0;
}
