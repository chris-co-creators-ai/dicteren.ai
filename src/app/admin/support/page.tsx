import { LifeBuoy, Mail, ExternalLink } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess } from "@/lib/auth/session";
import { SupportSearch } from "./support-search";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support · Admin" };

export default async function AdminSupportPage() {
  await assertStaffPageAccess("/admin/support");

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Support
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Zoek een klant op en open de cockpit om bij te springen: apparaten,
            licenties, orders, abonnementen en mails op één scherm.
          </p>
        </div>

        <div className="brand-card p-5">
          <SupportSearch />
        </div>

        <div className="brand-card flex flex-col items-center gap-3 px-6 py-8 text-center">
          <LifeBuoy
            className="size-8"
            strokeWidth={1.6}
            style={{ color: "var(--text-soft)" }}
          />
          <h3 className="text-sm font-bold">Inkomende vragen</h3>
          <p className="max-w-md text-sm text-[color:var(--text-muted)]">
            Klantvragen komen binnen op{" "}
            <a
              href="mailto:info@dicteren.ai"
              className="font-semibold text-[color:var(--navy)] underline-offset-2 hover:underline"
            >
              info@dicteren.ai
            </a>
            . Een eigen ticketing-tabel volgt in een latere slice; voor nu beheer
            je tickets in Gmail en handel je af via de cockpit hierboven.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <a
              href="https://mail.google.com/mail/u/0/#inbox"
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-secondary btn-sm"
            >
              <Mail className="size-3" strokeWidth={2.2} />
              Open inbox
              <ExternalLink className="size-3" strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
