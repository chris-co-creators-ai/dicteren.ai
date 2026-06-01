import { redirect } from "next/navigation";
import {
  classifyStage,
  identityKpis,
  listCustomerFunnel,
} from "@/lib/services/identity";
import { listAffiliates } from "@/lib/services/affiliate";
import { listDiscounts } from "@/lib/services/commerce";
import { listLeadLists, listAdminUsers } from "@/lib/services/leadList";
import { getColumnPrefs } from "@/lib/services/columnPrefs";
import { listCustomColumns } from "@/lib/services/customColumns";
import { getSession } from "@/lib/auth/session";
import {
  crmDealsKpis,
  listCrmOrganizations,
} from "@/lib/services/crmDeals";
import { loadCrmPeoplePage } from "@/lib/services/crmPeople";
import { canPerform } from "@/lib/services/staffActionPermissions";
import { CrmContainer } from "./crm-container";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?next=/admin/crm");

  const canCreateList = await canPerform({
    userId: session.user.id,
    role: session.user.role ?? null,
    action: "crm_list.create",
  });

  const { tab } = await searchParams;
  const initialTab: "people" | "organizations" =
    tab === "organizations" ? "organizations" : "people";

  // Scope: account_managers zien alleen hun eigen leads; admin ziet alles.
  // (account_owner_id-filter — anders lekt de CRM-lijst andermans pijplijn.)
  const isAdmin = session.user.role === "admin";
  const scopeOwnerId = isAdmin ? undefined : session.user.id;

  // Beide datasets parallel laden — client-side tab switcht zonder reload.
  const [
    rows,
    kpis,
    affiliates,
    discounts,
    lists,
    admins,
    prefs,
    customColumns,
    orgs,
    orgKpis,
  ] = await Promise.all([
    listCustomerFunnel(),
    identityKpis(),
    listAffiliates(),
    listDiscounts(),
    listLeadLists({ userId: session.user.id }),
    listAdminUsers(),
    getColumnPrefs(session.user.id),
    listCustomColumns(),
    listCrmOrganizations(
      scopeOwnerId ? { accountOwnerId: scopeOwnerId } : {},
    ),
    crmDealsKpis(scopeOwnerId),
  ]);

  // KPI-counts (header) over ALLE klanten, server-side. De zware rij-data gaat
  // NIET meer client-side: de personen-tabel komt gepagineerd uit
  // loadCrmPeoplePage. (TODO: deze KPI's later naar een pure SQL-aggregaat.)
  const stages: Record<
    "lead" | "trial_active" | "trial_expired" | "converted",
    number
  > = { lead: 0, trial_active: 0, trial_expired: 0, converted: 0 };
  for (const r of rows) stages[classifyStage(r)]++;

  // Eerste pagina personen (server-side gefilterd + gepagineerd). Client laadt
  // verdere pagina's + filter-wissels via /api/admin/crm/people.
  const peoplePage = await loadCrmPeoplePage({
    sessionUserId: session.user.id,
    filters: { scopeAssignedTo: scopeOwnerId ?? null },
    limit: 50,
  });

  const conversionPct =
    stages.trial_active + stages.trial_expired + stages.converted > 0
      ? Math.round(
          (stages.converted /
            (stages.trial_active + stages.trial_expired + stages.converted)) *
            100,
        )
      : 0;

  const mollieCount = rows.filter((r) => r.mollieCustomerId).length;
  const activeSubCount = rows.filter(
    (r) => r.subscriptionStatus === "active",
  ).length;

  return (
    <CrmContainer
      initialTab={initialTab}
      orgsProps={{
        currentUserId: session.user.id,
        organizations: orgs.map((o) => ({
          id: o.id,
          name: o.name,
          status: o.status,
          source: o.source,
          temperature: o.temperature,
          accountOwnerId: o.accountOwnerId,
          ownerName: o.ownerName,
          primaryContactName: o.primaryContactName,
          primaryContactEmail: o.primaryContactEmail,
          contactCount: o.contactCount,
          openTaskCount: o.openTaskCount,
          proposedSeats: o.proposedSeats,
          proposedAmountCents: o.proposedAmountCents,
          nextAction: o.nextAction,
          nextActionAt: o.nextActionAt?.toISOString() ?? null,
          city: o.city,
          kvk: o.kvk,
          updatedAt: o.updatedAt.toISOString(),
          createdAt: o.createdAt.toISOString(),
        })),
        kpis: orgKpis,
        admins: admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
        })),
      }}
      peopleProps={{
        currentUserId: session.user.id,
        isAdmin: session.user.role === "admin",
        canCreateList,
        customers: peoplePage.rows,
        initialNextCursor: peoplePage.nextCursor,
        totalPeople: peoplePage.total,
        customColumns,
        affiliates: affiliates.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          status: a.status,
        })),
        discountCodes: discounts.map((d) => ({
          id: d.id,
          code: d.code,
          affiliateId: d.affiliateId,
          isActive: d.isActive,
        })),
        lists: lists.map((l) => ({
          id: l.id,
          name: l.name,
          description: l.description,
          color: l.color,
          memberCount: l.memberCount,
          ownerUserId: l.ownerUserId,
          isShared: l.isShared,
        })),
        adminUsers: admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
        })),
        columnPrefs: prefs,
        stageCounts: stages,
        kpis: [
        {
          label: "Totaal klanten",
          value: String(kpis.totalUsers),
          detail: `${kpis.verifiedCount} geverifieerd`,
        },
        {
          label: "Trials actief",
          value: String(stages.trial_active),
          detail: `${stages.trial_expired} verlopen, niet betaald`,
        },
        {
          label: "Geconverteerd",
          value: String(stages.converted),
          detail: `${conversionPct}% van trial-gebruikers`,
        },
        {
          label: "Mollie customers",
          value: String(mollieCount),
          detail: `${activeSubCount} actieve subscription`,
        },
        ],
      }}
    />
  );
}
