// Dicteren.ai — Admin CRM: Organisaties-tab
// Lijst van crm_organizations met Kanban-view, side-panel en
// "+ Nieuwe organisatie"-modal. Toont alle drie de routes:
// am_outreach (handmatig), self_service (uit /zakelijk/start) en
// consumer_upgrade (Route H).

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  crmDealsKpis,
  listCrmOrganizations,
} from "@/lib/services/crmDeals";
import { listAdminUsers } from "@/lib/services/adminUsers";
import { OrganizationsView } from "./organizations-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organisaties · CRM · Admin" };

export default async function OrganizationsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?next=/admin/crm/organizations");

  const [orgs, kpis, admins] = await Promise.all([
    listCrmOrganizations(),
    crmDealsKpis(),
    listAdminUsers(),
  ]);

  return (
    <OrganizationsView
      currentUserId={session.user.id}
      organizations={orgs.map((o) => ({
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
      }))}
      kpis={kpis}
      admins={admins.map((a) => ({ id: a.id, name: a.name, email: a.email }))}
    />
  );
}
