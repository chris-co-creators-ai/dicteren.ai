import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertAdminOnly } from "@/lib/auth/session";
import { getPricing } from "@/lib/services/pricing";
import { PricingCalculator } from "./pricing-calculator";
import { PricingEditor } from "./pricing-editor";

export const metadata = { title: "Prijzen & reseller-commissie · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  await assertAdminOnly();
  const pricing = await getPricing(true);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Prijzen & reseller-commissie</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Beheer de zakelijke staffel + termijn-premies, en reken met de
            reseller-commissie-calculator.
          </p>
        </div>

        <PricingEditor initial={pricing} />

        <div className="mt-10">
          <h2 className="text-lg font-bold text-[color:var(--navy)]">
            Reseller-commissie calculator
          </h2>
          <p className="mb-4 text-sm text-[color:var(--text-muted)]">
            Verdeel de 50% commissie-pool tussen reseller en jezelf, vul het
            reseller-verkoopvolume per jaar in, en zie per klant én per jaar wat je
            recurring overhoudt.
          </p>
          <PricingCalculator />
        </div>
      </main>
    </>
  );
}
