import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/services/adminUsers";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users · Admin" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ show_staff?: string }>;
}) {
  await assertStaffPageAccess("/admin/users");
  const { show_staff } = await searchParams;
  const includeStaff = show_staff === "1";
  const users = await listAdminUsers({ includeStaff });

  const verified = users.filter((u) => u.emailVerified).length;
  const banned = users.filter((u) => u.banned).length;
  const admins = users.filter((u) => u.role === "admin").length;
  const paying = users.filter((u) => u.paidLicenseCount > 0).length;

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Klanten</h1>
          <p className="text-sm text-muted-foreground">
            Alle accounts: consumer-klanten, trial-users en B2B-members.
            Prospects zonder account leven in de sales-pijplijn op /admin/crm.
            Staff staat standaard verborgen en leeft in{" "}
            <a href="/admin/settings/staff" className="underline">
              /admin/settings/staff
            </a>
            . CRM-pipeline-context staat in{" "}
            <a href="/admin/crm" className="underline">
              /admin/crm
            </a>
            .{" "}
            {includeStaff ? (
              <a href="/admin/users" className="underline font-semibold">
                ← Verberg staff
              </a>
            ) : (
              <a href="/admin/users?show_staff=1" className="underline">
                Toon ook staff
              </a>
            )}
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <KPI label="Totaal users" value={String(users.length)} />
          <KPI
            label="Geverifieerd"
            value={String(verified)}
            detail={`${users.length - verified} niet geverifieerd`}
          />
          <KPI
            label="Betalend"
            value={String(paying)}
            detail="met actieve licentie"
          />
          <KPI
            label="Banned / Admins"
            value={`${banned} / ${admins}`}
            detail={`${banned} banned · ${admins} admins`}
          />
        </div>

        <UsersClient
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            emailVerified: u.emailVerified,
            banned: u.banned,
            banReason: u.banReason,
            banExpires: u.banExpires?.toISOString() ?? null,
            createdAt: u.createdAt.toISOString(),
            lastSessionAt: u.lastSessionAt?.toISOString() ?? null,
            accountType: u.accountType,
            paidLicenseCount: u.paidLicenseCount,
            organizations: u.organizations,
            latestLicenseSource: u.latestLicenseSource,
            latestLicenseType: u.latestLicenseType,
            hasAffiliateReferral: u.hasAffiliateReferral,
            affiliateName: u.affiliateName,
            activeSubscriptionId: u.activeSubscriptionId,
            activeSubscriptionCount: u.activeSubscriptionCount,
          }))}
        />
      </main>
    </>
  );
}

function KPI({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {detail && (
        <div className="mt-1 text-[0.6875rem] text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}
