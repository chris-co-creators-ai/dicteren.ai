import { listOrganizations } from "@/lib/services/identity";
import { OrganizationsView } from "./organizations-view";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const orgs = await listOrganizations();
  const totalSeats = orgs.reduce((s, o) => s + o.licenseCount, 0);
  const totalMembers = orgs.reduce((s, o) => s + o.memberCount, 0);

  return (
    <OrganizationsView
      organizations={orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        logo: o.logo,
        billingEmail: o.billingEmail,
        vatNumber: o.vatNumber,
        memberCount: o.memberCount,
        licenseCount: o.licenseCount,
        createdAt: o.createdAt.toISOString(),
      }))}
      kpis={[
        {
          label: "Organisaties",
          value: String(orgs.length),
          detail: orgs.length ? "Live uit Neon" : "Nog geen",
        },
        {
          label: "Totaal members",
          value: String(totalMembers),
          detail: "Uitgenodigd of geregistreerd",
        },
        {
          label: "Team-licenties",
          value: String(totalSeats),
          detail: "Toegewezen aan org",
        },
        {
          label: "Met BTW-nummer",
          value: String(orgs.filter((o) => o.vatNumber).length),
          detail: "Factuur-klaar",
        },
      ]}
    />
  );
}
