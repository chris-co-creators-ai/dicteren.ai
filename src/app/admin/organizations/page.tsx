import { listOrganizations } from "@/lib/services/identity";
import { getOrgSeatSnapshotBulk } from "@/lib/services/orgSeats";
import { assertStaffPageAccess } from "@/lib/auth/session";
import { OrganizationsView } from "./organizations-view";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  await assertStaffPageAccess("/admin/organizations");
  const orgs = await listOrganizations();
  const snapshots = await getOrgSeatSnapshotBulk(orgs.map((o) => o.id));

  let totalAssigned = 0;
  let totalSeats = 0;
  let totalDevices = 0;
  let totalMrr = 0;
  let warningCount = 0;

  for (const o of orgs) {
    const s = snapshots.get(o.id);
    if (!s) continue;
    totalSeats += s.totalSeats;
    totalAssigned += s.assignedSeats;
    totalDevices += s.activeDevicesTotal;
    totalMrr += Math.round((s.subscription?.amountCents ?? 0) / 12);
    if (s.utilizationPct >= 100) warningCount++;
  }

  return (
    <OrganizationsView
      organizations={orgs.map((o) => {
        const s = snapshots.get(o.id);
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          logo: o.logo,
          billingEmail: o.billingEmail,
          vatNumber: o.vatNumber,
          memberCount: o.memberCount,
          licenseCount: o.licenseCount,
          crmSource: o.crmSource,
          createdAt: o.createdAt.toISOString(),
          totalSeats: s?.totalSeats ?? 0,
          assignedSeats: s?.assignedSeats ?? 0,
          pendingSeats: s?.pendingSeats ?? 0,
          unassignedFreeSeats: s?.unassignedFreeSeats ?? 0,
          activeDevicesTotal: s?.activeDevicesTotal ?? 0,
          maxDevicesTotal: s?.maxDevicesTotal ?? 0,
          utilizationPct: s?.utilizationPct ?? 0,
          tierId: s?.currentTier.id ?? "tier_1_4",
          tierDiscountPct: s?.currentTier.discountPct ?? 0,
          annualCents: s?.subscription?.amountCents ?? s?.totalAnnualCents ?? 0,
          subscriptionStatus: s?.subscription?.status ?? null,
          nextBillingAt: s?.subscription?.nextBillingAt?.toISOString() ?? null,
        };
      })}
      kpis={[
        {
          label: "Organisaties",
          value: String(orgs.length),
          detail: orgs.length ? "Live uit Neon" : "Nog geen",
        },
        {
          label: "Seats toegewezen",
          value: `${totalAssigned} / ${totalSeats}`,
          detail: "Globaal team-totaal",
        },
        {
          label: "Apparaten actief",
          value: String(totalDevices),
          detail: "Over alle orgs",
        },
        {
          label: "MRR",
          value: new Intl.NumberFormat("nl-NL", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(totalMrr / 100),
          detail: `${warningCount} alert${warningCount === 1 ? "" : "s"}`,
        },
      ]}
    />
  );
}
