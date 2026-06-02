import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getCustomerSummary,
  getCustomerTimeline,
} from "@/lib/services/customer-timeline";
import { getCustomerSupportSnapshot } from "@/lib/services/adminSupport";
import { CustomerDetailView } from "./customer-detail-view";
import { SupportActions } from "./support-actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [summary, timeline, support] = await Promise.all([
    getCustomerSummary(userId),
    getCustomerTimeline(userId),
    getCustomerSupportSnapshot(userId),
  ]);

  if (!summary) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
      >
        <ArrowLeft className="size-3.5" />
        Terug naar CRM
      </Link>

      <CustomerDetailView
        summary={{
          id: summary.id,
          name: summary.name,
          email: summary.email,
          createdAt: summary.createdAt.toISOString(),
          emailVerified: summary.emailVerified,
          role: summary.role,
          trialStartedAt: summary.trialStartedAt?.toISOString() ?? null,
          trialExpiresAt: summary.trialExpiresAt?.toISOString() ?? null,
          trialStatus: summary.trialStatus,
          trialLicenseCode: summary.trialLicenseCode,
          paidLicenseCount: summary.paidLicenseCount,
          totalOrders: summary.totalOrders,
          totalRevenueCents: summary.totalRevenueCents,
          isConverted: summary.isConverted,
          emailsSent: summary.emailsSent,
          emailsOpened: summary.emailsOpened,
          emailsClicked: summary.emailsClicked,
          emailsBounced: summary.emailsBounced,
        }}
        timeline={timeline.map((e) => ({
          id: e.id,
          at: e.at.toISOString(),
          kind: e.kind,
          title: e.title,
          detail: e.detail,
        }))}
      >
        {support && <SupportActions snapshot={support} />}
      </CustomerDetailView>
    </div>
  );
}
