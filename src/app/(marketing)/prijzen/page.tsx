import { getPricing } from "@/lib/services/pricing";
import { PrijzenClient } from "./prijzen-client";

export const metadata = { title: "Prijzen · Dicteren.ai" };
// Live prijs-config zodat /prijzen exact toont wat checkout afrekent.
export const dynamic = "force-dynamic";

export default async function PrijzenPage() {
  const pricing = await getPricing();
  return <PrijzenClient pricing={pricing} />;
}
