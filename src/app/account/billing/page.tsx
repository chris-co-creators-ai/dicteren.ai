import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licenses,
  plans,
  subscriptions,
  userBilling,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { BillingView } from "./billing-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturering · Dicteren.ai" };

export default async function AccountBillingPage() {
  const session = (await getSession())!;

  const [billing] = await db
    .select()
    .from(userBilling)
    .where(eq(userBilling.userId, session.user.id))
    .limit(1);

  const subs = await db
    .select({
      id: subscriptions.id,
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      status: subscriptions.status,
      intervalLabel: subscriptions.intervalLabel,
      amountCents: subscriptions.amountCents,
      currency: subscriptions.currency,
      seats: subscriptions.seats,
      nextBillingAt: subscriptions.nextBillingAt,
      canceledAt: subscriptions.canceledAt,
      licenseId: subscriptions.licenseId,
      planLabel: plans.label,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, session.user.id));

  // Hydrate license codes for display.
  const linkedIds = subs.map((s) => s.licenseId).filter((id): id is string => Boolean(id));
  const linkedLicenses = linkedIds.length
    ? await db
        .select({
          id: licenses.id,
          code: licenses.code,
          status: licenses.status,
          expiresAt: licenses.expiresAt,
        })
        .from(licenses)
        .where(inArray(licenses.id, linkedIds))
    : [];

  const licenseById = new Map(linkedLicenses.map((l) => [l.id, l]));

  return (
    <BillingView
      hasCustomer={Boolean(billing?.mollieCustomerId)}
      subscriptions={subs.map((s) => {
        const lic = s.licenseId ? licenseById.get(s.licenseId) : null;
        return {
          id: s.id,
          mollieSubscriptionId: s.mollieSubscriptionId,
          status: s.status,
          intervalLabel: s.intervalLabel,
          amountCents: s.amountCents,
          currency: s.currency,
          seats: s.seats,
          nextBillingAt: s.nextBillingAt?.toISOString() ?? null,
          canceledAt: s.canceledAt?.toISOString() ?? null,
          planLabel: s.planLabel,
          licenseCode: lic?.code ?? null,
          licenseStatus: lic?.status ?? null,
        };
      })}
    />
  );
}
