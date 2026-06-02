// Dicteren.ai — Server-side gepagineerde CRM-personenlijst.
//
// Vervangt het "laad alles → filter in JS"-patroon. Klanten (auth.user) en
// prospects (crm_contacts zonder login) komen via één UNION in één
// keyset-gepagineerde query, met de filters als SQL-WHERE. Schaalt naar
// duizenden rijen omdat alleen de zichtbare pagina (≤ limit) over de lijn gaat.
//
// Raw SQL is hier nodig: drizzle kan deze UNION-met-CASE + tuple-keyset niet
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
};

export type CrmPeopleCursor = { createdAt: string; id: string };

export type CrmPeopleListRow = {
  id: string;
  kind: CrmPeopleKind;
  name: string;
  email: string;
  company: string | null;
  crmStage: string | null;
  temperature: string | null;
  assigneeId: string | null;
  notes: string | null;
  organizationId: string | null;
  createdAt: string;
};

/** De gedeelde UNION-bron. Identiek voor de page-query en de count-query. */
const PEOPLE_CTE = sql`
  WITH people AS (
    SELECT
      u.id::text                       AS id,
      'customer'::text                 AS kind,
      u.name                           AS name,
      u.email                          AS email,
      NULL::text                       AS company,
      ca.stage::text                   AS crm_stage,
      ca.temperature::text             AS temperature,
      ca.assigned_to_user_id::text     AS assignee_id,
      ca.notes                         AS notes,
      NULL::text                       AS organization_id,
      NULL::text                       AS industry,
      NULL::text                       AS company_size_range,
      NULL::int                        AS lead_score,
      u."createdAt"                    AS created_at
    FROM auth."user" u
    LEFT JOIN public.customer_attributes ca ON ca.user_id = u.id
    WHERE (u.role IS NULL OR u.role NOT IN ('admin','account_manager'))
    UNION ALL
    SELECT
      c.id::text,
      'prospect'::text,
      c.name,
      c.email,
      CASE WHEN o.name = 'Onbekende organisatie' THEN NULL ELSE o.name END,
      CASE o.status
        WHEN 'lead' THEN 'lead'
        WHEN 'contacted' THEN 'prospect'
        WHEN 'qualified' THEN 'sql'
        WHEN 'proposal_sent' THEN 'sql'
        WHEN 'negotiating' THEN 'sql'
        WHEN 'won' THEN 'customer'
        WHEN 'lost' THEN 'lost'
        ELSE 'lead'
      END,
      o.temperature::text,
      COALESCE(c.assigned_to_user_id, o.account_owner_id)::text,
      c.notes,
      c.crm_organization_id::text,
      c.industry,
      c.company_size_range,
      c.lead_score,
      c.created_at
    FROM public.crm_contacts c
    LEFT JOIN public.crm_organizations o ON o.id = c.crm_organization_id
    WHERE c.auth_user_id IS NULL
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
    company: string | null;
    crm_stage: string | null;
    temperature: string | null;
    assignee_id: string | null;
    notes: string | null;
    organization_id: string | null;
    created_at: string | Date;
  }>(
    sql`${PEOPLE_CTE}
        SELECT id, kind, name, email, company, crm_stage, temperature, assignee_id, notes, organization_id, created_at
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
    company: r.company,
    crmStage: r.crm_stage,
    temperature: r.temperature,
    assigneeId: r.assignee_id,
    notes: r.notes,
    organizationId: r.organization_id,
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
