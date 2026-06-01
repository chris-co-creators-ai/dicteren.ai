import { getSession } from "@/lib/auth/session";
import {
  listUserSubscriptionsForBilling,
} from "@/lib/services";
import { getUserBilling, listConsumerPlans } from "@/lib/services/order";
import { BillingView } from "./billing-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturering · Dicteren.ai" };

export default async function AccountBillingPage() {
  const session = (await getSession())!;
  const [billing, subscriptions, consumerPlans] = await Promise.all([
    getUserBilling(session.user.id),
    listUserSubscriptionsForBilling(session.user.id),
    listConsumerPlans(),
  ]);

  return (
    <BillingView
      hasCustomer={Boolean(billing?.mollieCustomerId)}
      subscriptions={subscriptions}
      consumerPlans={consumerPlans}
    />
  );
}
