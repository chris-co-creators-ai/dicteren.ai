import { listCustomers, identityKpis } from "@/lib/services/identity";
import { CrmView } from "./crm-view";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage() {
  const [rows, kpis] = await Promise.all([listCustomers(), identityKpis()]);
  const active = rows.filter((r) => r.licenseCount > 0).length;
  const leads = rows.filter((r) => r.licenseCount === 0).length;
  return (
    <CrmView
      customers={rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        emailVerified: r.emailVerified,
        licenseCount: r.licenseCount,
        createdAt: r.createdAt.toISOString(),
      }))}
      kpis={[
        {
          label: "Totaal klanten",
          value: String(kpis.totalUsers),
          detail: `${kpis.verifiedCount} geverifieerd`,
        },
        {
          label: "Met licentie",
          value: String(active),
          detail: kpis.totalUsers ? `${Math.round((active / kpis.totalUsers) * 100)}% van totaal` : "0%",
        },
        {
          label: "Zonder licentie",
          value: String(leads),
          detail: "Beta of nooit gekocht",
        },
        {
          label: "Admins",
          value: String(kpis.adminCount),
          detail: "Met toegang tot dashboard",
        },
      ]}
    />
  );
}
