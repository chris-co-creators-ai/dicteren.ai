import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess } from "@/lib/auth/session";
import { getPricing } from "@/lib/services/pricing";
import { PricingCalculator } from "./pricing-calculator";
import { PricingEditor } from "./pricing-editor";

export const metadata = { title: "Prijzen & reseller-commissie · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const session = await assertStaffPageAccess("/admin/pricing");
  const isAdmin = session.user.role === "admin";
  const pricing = await getPricing(true);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Prijzen & reseller-commissie</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Reken met de reseller-commissie-calculator. De zakelijke staffel +
            termijn-premies beheert de admin onderaan.
          </p>
        </div>

        <PricingCalculator />

        <div className="mt-10">
          <PricingEditor initial={pricing} isAdmin={isAdmin} />
        </div>
      </main>
    </>
  );
}
