import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PricingCalculator } from "./pricing-calculator";

export const metadata = { title: "Reseller-commissie · Admin" };

export default function AdminPricingPage() {
  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Reseller-commissie calculator</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Zakelijke deals. Verdeel de 50% commissie-pool tussen de reseller en jezelf
            en zie per seat-volume wat je onderaan de streep overhoudt — recurring per jaar.
          </p>
        </div>

        <PricingCalculator />
      </main>
    </>
  );
}
