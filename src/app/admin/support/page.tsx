import { LifeBuoy, Mail, ExternalLink } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support · Admin" };

export default async function AdminSupportPage() {
  // Geen tickets-tabel in de huidige schema. Support komt binnen via
  // info@dicteren.ai in Google Workspace. Tot we een ticketing-systeem
  // koppelen (Helpscout, Plain, of eigen tabel), tonen we de bron en kpi's
  // die we wél kunnen leveren.

  const kpis = [
    { label: "Inbox", value: "Google Workspace", detail: "info@dicteren.ai" },
    { label: "Geïntegreerd", value: "Nog niet", detail: "Slice n+1: ticket-tabel" },
    { label: "SLA-doel", value: "< 24u", detail: "Reactie op werkdagen" },
    { label: "Notitie", value: "Inbox", detail: "Niet gemockt" },
  ];

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Support
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Support-tickets staan in onze inbox. Integratie met een ticketing-tool
            volgt in een latere slice.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{k.value}</div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {k.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="brand-card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <LifeBuoy
            className="size-9"
            strokeWidth={1.6}
            style={{ color: "var(--text-soft)" }}
          />
          <h3 className="text-base font-bold">Geen ticketing-systeem aangesloten</h3>
          <p className="max-w-md text-sm text-[color:var(--text-muted)]">
            Klantvragen komen binnen op{" "}
            <a
              href="mailto:info@dicteren.ai"
              className="font-semibold text-[color:var(--navy)] underline-offset-2 hover:underline"
            >
              info@dicteren.ai
            </a>
            . Tot we een eigen `support_tickets`-tabel of een externe tool koppelen,
            beheer je tickets in Gmail.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="https://mail.google.com/mail/u/0/#inbox"
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-primary btn-sm"
            >
              <Mail className="size-3" strokeWidth={2.2} />
              Open inbox
              <ExternalLink className="size-3" strokeWidth={2} />
            </a>
            <a
              href="mailto:info@dicteren.ai"
              className="btn btn-secondary btn-sm"
            >
              Nieuwe e-mail
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
