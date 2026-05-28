// Dicteren.ai — Admin org detail-page
//
// Volledige inzicht voor support en account-management:
//   • header met owner-info
//   • seat-snapshot
//   • subscription + history (org_subscription_history)
//   • seats-tabel
//   • devices-tabel
//   • audit-feed (org + license events)
//   • billing-gegevens

import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licenses,
  orgSubscriptionHistory,
  payments,
  orders,
} from "@/lib/db/schema";
import { assertAdminOnly } from "@/lib/auth/session";
import {
  getOrgSeatSnapshot,
  listOrgSeats,
  listOrgDevices,
  getOrgOwner,
  getOrgInfo,
  getOrgAuditFeed,
  getOrganizationBilling,
} from "@/lib/services";
import {
  findCrmOrgByAuthOrganizationId,
  listTasksForOrg,
} from "@/lib/services/crmDeals";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { OrgAdminView } from "./view";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Params;
}) {
  await assertAdminOnly();
  const { id: orgId } = await params;

  const org = await getOrgInfo(orgId);
  if (!org) redirect("/admin/organizations");

  const [
    snapshot,
    seats,
    devices,
    owner,
    history,
    billing,
    paymentRows,
  ] = await Promise.all([
    getOrgSeatSnapshot(orgId),
    listOrgSeats(orgId),
    listOrgDevices(orgId),
    getOrgOwner(orgId),
    db
      .select()
      .from(orgSubscriptionHistory)
      .where(eq(orgSubscriptionHistory.organizationId, orgId))
      .orderBy(desc(orgSubscriptionHistory.createdAt))
      .limit(50),
    getOrganizationBilling(orgId),
    db
      .select({
        id: payments.id,
        molliePaymentId: payments.molliePaymentId,
        amountCents: payments.amountCents,
        status: payments.status,
        createdAt: payments.createdAt,
        orderId: payments.orderId,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(orders.organizationId, orgId))
      .orderBy(desc(payments.createdAt))
      .limit(20),
  ]);

  const licenseIds = seats.map((s) => s.licenseId);
  const auditFeed = await getOrgAuditFeed(orgId, licenseIds, 100);

  // CRM-koppeling: tasks-lijst hangt aan crm_organizations.id, niet auth.org.id.
  const crmOrg = await findCrmOrgByAuthOrganizationId(orgId);
  const tasks = crmOrg ? await listTasksForOrg(crmOrg.id) : [];

  // Hand off plain JSON aan client view
  return (
    <>
      <AdminTopbar />
      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/organizations"
            className="text-sm text-[color:var(--text-muted)] hover:underline"
          >
            ← Organisaties
          </Link>
        </div>

        <OrgAdminView
          org={{
            id: org.id,
            name: org.name,
            slug: org.slug,
          }}
          owner={
            owner
              ? {
                  userId: owner.userId,
                  name: owner.name,
                  email: owner.email,
                }
              : null
          }
          snapshot={{
            totalSeats: snapshot.totalSeats,
            assignedSeats: snapshot.assignedSeats,
            pendingSeats: snapshot.pendingSeats,
            unassignedFreeSeats: snapshot.unassignedFreeSeats,
            revokedSeats: snapshot.revokedSeats,
            activeDevicesTotal: snapshot.activeDevicesTotal,
            maxDevicesTotal: snapshot.maxDevicesTotal,
            utilizationPct: snapshot.utilizationPct,
            tierId: snapshot.currentTier.id,
            tierDiscountPct: snapshot.currentTier.discountPct,
            perSeatPriceCents: snapshot.perSeatPriceCents,
            totalAnnualCents: snapshot.totalAnnualCents,
            subscription: snapshot.subscription
              ? {
                  id: snapshot.subscription.id,
                  status: snapshot.subscription.status,
                  nextBillingAt:
                    snapshot.subscription.nextBillingAt?.toISOString() ?? null,
                  mollieSubscriptionId:
                    snapshot.subscription.mollieSubscriptionId,
                  amountCents: snapshot.subscription.amountCents,
                }
              : null,
          }}
          seats={seats.map((s) => ({
            licenseId: s.licenseId,
            code: s.code,
            status: s.status,
            assignedUserName: s.assignedUserName,
            assignedUserEmail: s.assignedUserEmail,
            pendingInvitationEmail: s.pendingInvitationEmail,
            activeDevicesCount: s.activeDevicesCount,
            assignedAt: s.assignedAt?.toISOString() ?? null,
            issuedAt: s.issuedAt.toISOString(),
            expiresAt: s.expiresAt?.toISOString() ?? null,
          }))}
          devices={devices.map((d) => ({
            activationId: d.activationId,
            licenseCode: d.licenseCode,
            memberName: d.memberName,
            memberEmail: d.memberEmail,
            platform: d.platform,
            appVersion: d.appVersion,
            activatedAt: d.activatedAt.toISOString(),
            lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
            isActive: d.isActive,
          }))}
          history={history.map((h) => ({
            id: h.id,
            oldSeats: h.oldSeats,
            newSeats: h.newSeats,
            oldAmountCents: h.oldAmountCents,
            newAmountCents: h.newAmountCents,
            oldTier: h.oldTier,
            newTier: h.newTier,
            reason: h.reason,
            prorataChargeCents: h.prorataChargeCents,
            createdAt: h.createdAt.toISOString(),
          }))}
          payments={paymentRows.map((p) => ({
            id: p.id,
            molliePaymentId: p.molliePaymentId,
            amountCents: p.amountCents,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
          }))}
          billing={
            billing
              ? {
                  billingEmail: billing.billingEmail,
                  vatNumber: billing.vatNumber,
                  addressLine1: billing.addressLine1,
                  addressLine2: billing.addressLine2,
                  postalCode: billing.postalCode,
                  city: billing.city,
                  countryCode: billing.countryCode,
                  purchaseOrderNumber: billing.purchaseOrderNumber,
                }
              : null
          }
          auditFeed={auditFeed.map((a) => ({
            id: a.id,
            eventType: a.eventType,
            properties: a.properties,
            occurredAt: a.occurredAt.toISOString(),
            userId: a.userId,
          }))}
          crmOrganizationId={crmOrg?.id ?? null}
          initialTasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            kind: t.kind,
            dueAt: t.dueAt?.toISOString() ?? null,
            notes: t.notes,
            completedAt: t.completedAt?.toISOString() ?? null,
            createdAt: t.createdAt.toISOString(),
          }))}
        />
      </div>
    </>
  );
}
