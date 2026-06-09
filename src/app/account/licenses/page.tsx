import { listUserLicenses, listUserDevices } from "@/lib/services";
import { getSession } from "@/lib/auth/session";
import { getCheckoutReceipt } from "@/lib/services/order";
import { LicensesView } from "./licenses-view";
import { PurchaseBanner } from "./purchase-banner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn licenties · Dicteren.ai" };

type SearchParams = Promise<{ betaald?: string }>;

export default async function AccountLicensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = (await getSession())!;
  const { betaald: orderId } = await searchParams;

  const [licenses, devices, receipt] = await Promise.all([
    listUserLicenses(session.user.id),
    listUserDevices(session.user.id),
    orderId ? getCheckoutReceipt(orderId, session.user.id) : Promise.resolve(null),
  ]);

  return (
    <>
      {receipt && (
        <PurchaseBanner
          order={receipt.order}
          plan={receipt.plan}
          buyerEmail={receipt.buyer?.email ?? null}
        />
      )}
      <LicensesView licenses={licenses} devices={devices} />
    </>
  );
}
