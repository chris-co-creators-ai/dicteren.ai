import {
  classifyStage,
  funnelStageCounts,
  identityKpis,
  listCustomerFunnel,
} from "@/lib/services/identity";
import { CrmView } from "./crm-view";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage() {
  const [rows, stages, kpis] = await Promise.all([
    listCustomerFunnel(),
    funnelStageCounts(),
    identityKpis(),
  ]);

  const conversionPct =
    stages.trial_active + stages.trial_expired + stages.converted > 0
      ? Math.round(
          (stages.converted /
            (stages.trial_active + stages.trial_expired + stages.converted)) *
            100,
        )
      : 0;

  return (
    <CrmView
      customers={rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        emailVerified: r.emailVerified,
        role: r.role,
        createdAt: r.createdAt.toISOString(),
        trialStartedAt: r.trialStartedAt?.toISOString() ?? null,
        trialExpiresAt: r.trialExpiresAt?.toISOString() ?? null,
        trialStatus: r.trialStatus,
        paidLicenseCount: r.paidLicenseCount,
        emailsSent: r.emailsSent,
        emailsOpened: r.emailsOpened,
        emailsClicked: r.emailsClicked,
        emailsBounced: r.emailsBounced,
        stage: classifyStage(r),
      }))}
      stageCounts={stages}
      kpis={[
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
          label: "Leads zonder trial",
          value: String(stages.lead),
          detail: "Account, nog niet gestart",
        },
      ]}
    />
  );
}
