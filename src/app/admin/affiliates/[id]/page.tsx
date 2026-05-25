import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import {
  getAffiliateById,
  getAffiliateStats,
  listAffiliateReferrals,
  listAffiliateCommissions,
} from "@/lib/services/affiliate";
import { listDiscountCodesForAffiliate } from "@/lib/services/discount";
import { AffiliateDetailClient } from "./affiliate-detail-client";

export const dynamic = "force-dynamic";

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Params = Promise<{ id: string }>;

export default async function AffiliateDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const affiliate = await getAffiliateById(id);
  if (!affiliate) notFound();

  const [stats, referrals, commissions, discountCodes] = await Promise.all([
    getAffiliateStats(id),
    listAffiliateReferrals(id),
    listAffiliateCommissions(id),
    listDiscountCodesForAffiliate(id),
  ]);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <Link
          href="/admin/affiliates"
          className="text-xs font-semibold text-muted-foreground hover:underline"
        >
          ← Terug naar affiliates
        </Link>

        <AffiliateDetailClient
          affiliate={{
            id: affiliate.id,
            code: affiliate.code,
            name: affiliate.name,
            contactEmail: affiliate.contactEmail,
            contactPhone: affiliate.contactPhone,
            status: affiliate.status,
            commissionType: affiliate.commissionType,
            commissionPct: affiliate.commissionPct,
            commissionFixedCents: affiliate.commissionFixedCents,
            payoutMethod: affiliate.payoutMethod,
            internalNotes: affiliate.internalNotes,
            totalEarnedCents: affiliate.totalEarnedCents,
            totalPaidCents: affiliate.totalPaidCents,
          }}
          stats={{
            referralCount: stats.referralCount,
            convertedCount: stats.convertedCount,
            pendingCents: stats.pendingCents,
            payableCents: stats.payableCents,
            paidCents: stats.paidCents,
          }}
          referrals={referrals.map((r) => ({
            referralId: r.referralId,
            userId: r.userId,
            userName: r.userName,
            userEmail: r.userEmail,
            organizationId: r.organizationId,
            firstSeenAt: r.firstSeenAt.toISOString(),
            convertedAt: r.convertedAt?.toISOString() ?? null,
          }))}
          commissions={commissions.map(({ commission, licenseCode }) => ({
            id: commission.id,
            createdAt: commission.createdAt.toISOString(),
            orderId: commission.orderId,
            licenseCode: licenseCode ?? null,
            basisAmountCents: commission.basisAmountCents,
            seats: commission.seats,
            amountCents: commission.amountCents,
            status: commission.status,
            paidAt: commission.paidAt?.toISOString() ?? null,
            paidReference: commission.paidReference,
          }))}
          discountCodes={discountCodes.map((d) => ({
            id: d.id,
            code: d.code,
            type: d.type,
            value: d.value,
            appliesTo: d.appliesTo,
            redemptionCount: d.redemptionCount,
            maxRedemptions: d.maxRedemptions,
            isActive: d.isActive,
            validUntil: d.validUntil?.toISOString() ?? null,
            createdAt: d.createdAt.toISOString(),
          }))}
          formatEur={eur}
        />
      </main>
    </>
  );
}
