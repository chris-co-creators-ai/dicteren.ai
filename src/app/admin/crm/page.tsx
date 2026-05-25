import { redirect } from "next/navigation";
import {
  classifyStage,
  funnelStageCounts,
  identityKpis,
  listCustomerFunnel,
} from "@/lib/services/identity";
import { listAffiliates } from "@/lib/services/affiliate";
import { listDiscounts } from "@/lib/services/commerce";
import {
  listLeadLists,
  listAdminUsers,
  membershipsByUser,
} from "@/lib/services/leadList";
import {
  attributesByUser,
  defaultStageFor,
  defaultTemperatureFor,
} from "@/lib/services/customerCrm";
import { getColumnPrefs } from "@/lib/services/columnPrefs";
import { getSession } from "@/lib/auth/session";
import { CrmView } from "./crm-view";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?next=/admin/crm");

  const [rows, stages, kpis, affiliates, discounts, lists, admins, prefs] =
    await Promise.all([
      listCustomerFunnel(),
      funnelStageCounts(),
      identityKpis(),
      listAffiliates(),
      listDiscounts(),
      listLeadLists({ userId: session.user.id }),
      listAdminUsers(),
      getColumnPrefs(session.user.id),
    ]);

  const userIds = rows.map((r) => r.id);
  const [attrs, memberships] = await Promise.all([
    attributesByUser(userIds),
    membershipsByUser({ visibleListIds: lists.map((l) => l.id) }),
  ]);

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
    <CrmView
      currentUserId={session.user.id}
      customers={rows.map((r) => {
        const attr = attrs.get(r.id);
        return {
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
          discountCodeUsed: r.discountCodeUsed
            ? {
                id: r.discountCodeUsed.id,
                code: r.discountCodeUsed.code,
                affiliateId: r.discountCodeUsed.affiliateId,
              }
            : null,
          // CRM-attributen: stage/temp/assignee/notes — default-afleiding als
          // er nog geen rij in customer_attributes is.
          crmStage:
            attr?.stage ??
            defaultStageFor(r.paidLicenseCount, r.trialStatus),
          crmTemperature:
            attr?.temperature ??
            defaultTemperatureFor(r.trialStatus, r.paidLicenseCount),
          assignedToUserId: attr?.assignedToUserId ?? null,
          notes: attr?.notes ?? null,
          listIds: memberships.get(r.id) ?? [],
        };
      })}
      affiliates={affiliates.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        status: a.status,
      }))}
      discountCodes={discounts.map((d) => ({
        id: d.id,
        code: d.code,
        affiliateId: d.affiliateId,
        isActive: d.isActive,
      }))}
      lists={lists.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        color: l.color,
        memberCount: l.memberCount,
        ownerUserId: l.ownerUserId,
        isShared: l.isShared,
      }))}
      adminUsers={admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
      }))}
      columnPrefs={prefs}
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
