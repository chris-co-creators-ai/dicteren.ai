import {
  classifyStage,
  funnelStageCounts,
  identityKpis,
  listCustomerFunnel,
} from "@/lib/services/identity";
import { listAffiliates } from "@/lib/services/affiliate";
import { CrmView } from "./crm-view";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage() {
  const [rows, stages, kpis, affiliates] = await Promise.all([
    listCustomerFunnel(),
    funnelStageCounts(),
    identityKpis(),
    listAffiliates(),
  ]);

  const conversionPct =
    stages.trial_active + stages.trial_expired + stages.converted > 0
      ? Math.round(
          (stages.converted /
            (stages.trial_active + stages.trial_expired + stages.converted)) *
            100,
        )
      : 0;

  // KPI: hoeveel users hebben Mollie customer + actieve subscription.
  const mollieCount = rows.filter((r) => r.mollieCustomerId).length;
  const activeSubCount = rows.filter(
    (r) => r.subscriptionStatus === "active",
  ).length;

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
        segment: r.segment,
        licenseSource: r.licenseSource,
        discountType: r.discountType,
        discountValue: r.discountValue,
        mollieCustomerId: r.mollieCustomerId,
        subscriptionStatus: r.subscriptionStatus,
        nextBillingAt: r.nextBillingAt?.toISOString() ?? null,
        accountOwner: r.accountOwner
          ? {
              affiliateId: r.accountOwner.affiliateId,
              code: r.accountOwner.code,
              name: r.accountOwner.name,
              convertedAt:
                r.accountOwner.convertedAt?.toISOString() ?? null,
            }
          : null,
      }))}
      affiliates={affiliates.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        status: a.status,
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
          label: "Mollie customers",
          value: String(mollieCount),
          detail: `${activeSubCount} actieve subscription`,
        },
      ]}
    />
  );
}
