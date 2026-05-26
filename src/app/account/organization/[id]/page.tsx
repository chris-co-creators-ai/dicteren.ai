import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  listManageableOrganizations,
  listOrganizationMembers,
  getOrganizationBilling,
  getOrganization,
  getOrgSeatSnapshot,
  listOrgSeats,
  listOrgDevices,
} from "@/lib/services";
import { OrgDashboard } from "../org-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn organisatie · Dicteren.ai" };

type Params = Promise<{ id: string }>;
type Search = Promise<{ tab?: string; upgrade?: string }>;

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id: orgId } = await params;
  const { tab = "seats", upgrade } = await searchParams;

  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/sign-in?next=/account/organization/${orgId}`);
  }

  // Owner/admin? Anders fallback voor member naar read-only view
  const manageable = await listManageableOrganizations(session.user.id);
  const active = manageable.find((o) => o.id === orgId);
  const isAdmin = Boolean(active);

  const orgRow = await getOrganization(orgId);
  if (!orgRow) redirect("/account/organization");

  const [members, billing, snapshot, seats, devices] = await Promise.all([
    listOrganizationMembers(orgId),
    getOrganizationBilling(orgId),
    getOrgSeatSnapshot(orgId),
    listOrgSeats(orgId),
    listOrgDevices(orgId),
  ]);

  // Verify member-relation als geen admin
  if (!isAdmin) {
    const isMember = members.some((m) => m.userId === session.user.id);
    if (!isMember) redirect("/account/organization");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {manageable.length > 1 && (
        <OrgSwitcher orgs={manageable} activeId={orgId} />
      )}

      <OrgDashboard
        orgId={orgId}
        orgName={orgRow.name}
        currentUserId={session.user.id}
        currentUserName={session.user.name ?? session.user.email}
        currentUserEmail={session.user.email}
        isAdmin={isAdmin}
        role={active?.role ?? "member"}
        snapshot={{
          totalSeats: snapshot.totalSeats,
          assignedSeats: snapshot.assignedSeats,
          pendingSeats: snapshot.pendingSeats,
          unassignedFreeSeats: snapshot.unassignedFreeSeats,
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
                amountCents: snapshot.subscription.amountCents,
              }
            : null,
        }}
        seats={seats.map((s) => ({
          licenseId: s.licenseId,
          code: s.code,
          status: s.status,
          assignedUserId: s.assignedUserId,
          assignedUserName: s.assignedUserName,
          assignedUserEmail: s.assignedUserEmail,
          pendingInvitationEmail: s.pendingInvitationEmail,
          pendingInvitationId: s.pendingInvitationId,
          pendingInvitationExpiresAt:
            s.pendingInvitationExpiresAt?.toISOString() ?? null,
          activeDevicesCount: s.activeDevicesCount,
          assignedAt: s.assignedAt?.toISOString() ?? null,
          issuedAt: s.issuedAt.toISOString(),
          expiresAt: s.expiresAt?.toISOString() ?? null,
          seatLabel: s.seatLabel,
        }))}
        devices={devices.map((d) => ({
          activationId: d.activationId,
          licenseId: d.licenseId,
          licenseCode: d.licenseCode,
          memberName: d.memberName,
          memberEmail: d.memberEmail,
          platform: d.platform,
          appVersion: d.appVersion,
          activatedAt: d.activatedAt.toISOString(),
          lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
          isActive: d.isActive,
        }))}
        members={members.map((m) => ({
          memberId: m.memberId,
          userId: m.userId,
          role: m.role,
          name: m.name,
          email: m.email,
          since: m.memberSince.toISOString(),
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
        initialTab={tab}
        upgradeStatus={upgrade ?? null}
      />
    </main>
  );
}

function OrgSwitcher({
  orgs,
  activeId,
}: {
  orgs: Array<{ id: string; name: string; role: string }>;
  activeId: string;
}) {
  return (
    <nav
      aria-label="Organisaties"
      className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[color:var(--border-soft)] bg-white p-2"
    >
      {orgs.map((o) => {
        const isActive = o.id === activeId;
        return (
          <Link
            key={o.id}
            href={`/account/organization/${o.id}`}
            className={
              isActive
                ? "rounded-lg bg-[color:var(--navy)] px-3 py-1.5 text-xs font-bold text-white"
                : "rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
            }
            aria-current={isActive ? "page" : undefined}
          >
            {o.name}
          </Link>
        );
      })}
    </nav>
  );
}
