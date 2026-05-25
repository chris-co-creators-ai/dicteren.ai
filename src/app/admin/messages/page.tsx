import { AdminTopbar } from "@/components/admin/admin-topbar";
import {
  contactMessageKpis,
  listContactMessages,
} from "@/lib/services/contactMessage";
import { listAdminUsers } from "@/lib/services/leadList";
import { MessagesClient } from "./messages-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Berichten · Admin" };

export default async function AdminMessagesPage() {
  const [messages, kpis, admins] = await Promise.all([
    listContactMessages({}),
    contactMessageKpis(),
    listAdminUsers(),
  ]);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Berichten</h1>
          <p className="text-sm text-muted-foreground">
            Inkomende contact-, partnership- en offerte-aanvragen vanaf de
            publieke site.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <KPI
            label="Totaal"
            value={String(kpis.total)}
            detail="alle berichten"
          />
          <KPI
            label="Nieuw"
            value={String(kpis.newCount)}
            detail="nog niet opgepakt"
          />
          <KPI
            label="Partnership-aanvragen"
            value={String(kpis.partnershipCount)}
            detail="reseller-applicaties"
          />
        </div>

        <MessagesClient
          messages={messages.map((m) => ({
            id: m.id,
            kind: m.kind,
            status: m.status,
            name: m.name,
            email: m.email,
            company: m.company,
            phone: m.phone,
            subject: m.subject,
            message: m.message,
            assignedToUserId: m.assignedToUserId,
            linkedAffiliateId: m.linkedAffiliateId,
            linkedUserId: m.linkedUserId,
            adminNotes: m.adminNotes,
            createdAt: m.createdAt.toISOString(),
          }))}
          adminUsers={admins.map((a) => ({ id: a.id, name: a.name }))}
        />
      </main>
    </>
  );
}

function KPI({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[0.6875rem] text-muted-foreground">{detail}</div>
    </div>
  );
}
