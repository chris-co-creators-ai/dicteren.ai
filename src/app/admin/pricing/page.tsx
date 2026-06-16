import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess } from "@/lib/auth/session";
import { getPricing } from "@/lib/services/pricing";
import { PricingTabs } from "./pricing-tabs";

export const metadata = { title: "Prijzen, offertes & reseller-commissie · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; org?: string }>;
}) {
  const session = await assertStaffPageAccess("/admin/pricing");
  const isAdmin = session.user.role === "admin";
  const pricing = await getPricing(true);
  const sp = await searchParams;
  const initialTab = sp.tab === "offerte" ? "offerte" : "reseller";
  const initialOrgId = sp.org ?? null;

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Prijzen, offertes &amp; reseller-commissie</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Reken reseller-commissie of maak een zakelijke offerte op maat. De
            staffel + termijn-premies beheert de admin onderaan.
          </p>
        </div>

        <PricingTabs
          pricing={pricing}
          isAdmin={isAdmin}
          initialTab={initialTab}
          initialOrgId={initialOrgId}
        />
      </main>
    </>
  );
}
