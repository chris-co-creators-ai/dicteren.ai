import { listPartnerOrgs, partnerOrgsKpis } from "@/lib/services";
import { requireAdminOrManager } from "@/lib/auth/session";
import { PartnersCrmView } from "./partners-crm-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partners · Admin · Dicteren.ai" };

export default async function AdminPartnersPage() {
  const session = await requireAdminOrManager();
  const [orgs, kpis] = await Promise.all([
    listPartnerOrgs(),
    partnerOrgsKpis(),
  ]);

  return (
    <PartnersCrmView
      currentUserName={session.user.name || "Christian Bleeker"}
      orgs={orgs.map((o) => ({
        id: o.id,
        externalId: o.externalId,
        organizationName: o.organizationName,
        priority: o.priority,
        segment: o.segment,
        outreachStatus: o.outreachStatus,
        pilotStatus: o.pilotStatus,
        email: o.email,
        city: o.city,
        accountOwner: o.accountOwner,
        followUpDate: o.followUpDate,
        freeCodesCount: o.freeCodesCount,
        partnerCode: o.partnerCode,
        licenseStatus: o.licenseStatus,
        activeActivations: o.activeActivations,
      }))}
      kpis={{
        total: kpis.total,
        perStatus: kpis.perStatus,
        activeCodes: kpis.activeCodes,
        totalActivations: kpis.totalActivations,
        activeActivations: kpis.activeActivations,
        last7DaysActivations: kpis.last7DaysActivations,
        last30DaysActivations: kpis.last30DaysActivations,
      }}
    />
  );
}
