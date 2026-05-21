import { listEmailLogs, emailKpis } from "@/lib/services/commerce";
import { EmailsView } from "./emails-view";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  const [rows, kpis] = await Promise.all([listEmailLogs(300), emailKpis()]);

  return (
    <EmailsView
      emails={rows.map((r) => ({
        id: r.id,
        resendId: r.resendId,
        toAddress: r.toAddress,
        fromAddress: r.fromAddress,
        subject: r.subject,
        category: r.category,
        status: r.status,
        errorMessage: r.errorMessage,
        errorCode: r.errorCode,
        userName: r.userName,
        userEmail: r.userEmail,
        licenseCode: r.licenseCode,
        orderId: r.orderId,
        subscriptionId: r.subscriptionId,
        sentAt: r.sentAt.toISOString(),
        deliveredAt: r.deliveredAt?.toISOString() ?? null,
        lastEventAt: r.lastEventAt?.toISOString() ?? null,
      }))}
      kpis={[
        {
          label: "Verstuurd",
          value: String(kpis.sent),
          detail: `${kpis.total} totaal`,
        },
        {
          label: "Afgeleverd",
          value: String(kpis.delivered),
          detail: kpis.total > 0 ? `${Math.round((kpis.delivered / kpis.total) * 100)}%` : "—",
        },
        {
          label: "Bounced",
          value: String(kpis.bounced),
          detail: "bounce + complaint",
        },
        {
          label: "Mislukt",
          value: String(kpis.failed),
          detail: "send-fout (Resend)",
        },
      ]}
      categoryStats={kpis.byCategory}
    />
  );
}
