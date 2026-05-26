import { listOrders, commerceKpis } from "@/lib/services/commerce";
import { formatMollieAmount } from "@/lib/services/mollie";
import { assertAdminOnly } from "@/lib/auth/session";
import { OrdersTable } from "./orders-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await assertAdminOnly();
  const [rows, kpis] = await Promise.all([listOrders(200), commerceKpis()]);
  return (
    <OrdersTable
      orders={rows.map((o) => ({
        id: o.id,
        reference: `ord_${o.id.slice(0, 8).toUpperCase()}`,
        molliePaymentId: o.molliePaymentId,
        customer: o.customerName ?? "Onbekend",
        email: o.customerEmail ?? "—",
        plan: o.planLabel ?? o.planSlug ?? "—",
        amount: formatMollieAmount(o.amountCents, o.currency),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      }))}
      kpis={[
        {
          label: "Totaal orders",
          value: String(kpis.ordersTotal),
          detail: `${kpis.ordersPaid} betaald · ${kpis.ordersPending} pending`,
        },
        {
          label: "Omzet laatste 30 dagen",
          value: formatMollieAmount(kpis.revenueCents30d),
          detail: `${formatMollieAmount(kpis.revenueCentsAllTime)} totaal`,
        },
        {
          label: "Mislukte betalingen",
          value: String(kpis.ordersFailed),
          detail: kpis.ordersFailed ? "Bekijken in tabel" : "Geen recent",
        },
        {
          label: "Terugbetalingen",
          value: String(kpis.ordersRefunded),
          detail: "Webhook-bron Mollie",
        },
      ]}
    />
  );
}
