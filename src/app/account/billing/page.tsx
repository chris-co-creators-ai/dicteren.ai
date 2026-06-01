import { getSession } from "@/lib/auth/session";
import {
  listUserSubscriptionsForBilling,
} from "@/lib/services";
import { getUserBilling, listConsumerPlans } from "@/lib/services/order";
import { listUserInvoices } from "@/lib/services/commerce";
import { BillingView } from "./billing-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturering · Dicteren.ai" };

export default async function AccountBillingPage() {
  const session = (await getSession())!;
  const [billing, subscriptions, consumerPlans, invoices] = await Promise.all([
    getUserBilling(session.user.id),
    listUserSubscriptionsForBilling(session.user.id),
    listConsumerPlans(),
    listUserInvoices(session.user.id),
  ]);

  return (
    <BillingView
      hasCustomer={Boolean(billing?.mollieCustomerId)}
      subscriptions={subscriptions}
      consumerPlans={consumerPlans}
      invoices={invoices.map((i) => ({
        orderId: i.orderId,
        number: i.number,
        issuedAt: i.issuedAt.toISOString(),
        totalCents: i.totalCents,
        currency: i.currency,
        planLabel: i.planLabel,
      }))}
    />
  );
}
