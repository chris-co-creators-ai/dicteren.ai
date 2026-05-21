import {
  listLicenses,
  commerceKpis,
  licenseDistribution,
} from "@/lib/services/commerce";
import { LicensesView } from "./licenses-view";

export const dynamic = "force-dynamic";

export default async function AdminLicensesPage() {
  const [rows, kpis, distribution] = await Promise.all([
    listLicenses(500),
    commerceKpis(),
    licenseDistribution(),
  ]);

  const totalByType = (t: string) => distribution.find((d) => d.type === t)?.count ?? 0;
  const expiringSoon = rows.filter((r) => {
    if (!r.expiresAt || r.status !== "active") return false;
    const ms = new Date(r.expiresAt).getTime() - Date.now();
    return ms > 0 && ms < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <LicensesView
      licenses={rows.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        status: r.status,
        seats: r.seats,
        activationCount: r.activationCount,
        userEmail: r.userEmail,
        planSlug: r.planSlug,
        issuedAt: r.issuedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
      }))}
      kpis={[
        {
          label: "Totaal licenties",
          value: String(kpis.licensesTotal),
          detail: `${kpis.licensesActive} actief`,
        },
        {
          label: "Beta",
          value: String(totalByType("beta")),
          detail: "Beta-toegang",
        },
        {
          label: "Persoonlijk",
          value: String(totalByType("consumer")),
          detail: "Maand · kwartaal · jaar",
        },
        {
          label: "Verloopt < 30d",
          value: String(expiringSoon),
          detail: "Stuur herinnering",
        },
      ]}
    />
  );
}
