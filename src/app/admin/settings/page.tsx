import { AlertTriangle, CheckCircle2, Plus, XCircle } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { pingMollie } from "@/lib/services/mollie";
import { listCustomers } from "@/lib/services/identity";
import { listAuditEvents } from "@/lib/services/commerce";
import { assertStaffPageAccess } from "@/lib/auth/session";

type IntegrationStatus = "connected" | "disconnected" | "error";

export const metadata = { title: "Instellingen · Admin" };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  owner: "Eigenaar",
  admin: "Admin",
  support: "Support",
  user: "Gebruiker",
};

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Net actief";
  if (min < 60) return `${min} min geleden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} u geleden`;
  const d = Math.floor(h / 24);
  return `${d}d geleden`;
}

function StatusIcon({ status }: { status: IntegrationStatus }) {
  if (status === "connected")
    return <CheckCircle2 className="size-4" strokeWidth={2} style={{ color: "var(--green)" }} />;
  if (status === "error")
    return <AlertTriangle className="size-4" strokeWidth={2} style={{ color: "var(--red)" }} />;
  return <XCircle className="size-4" strokeWidth={2} style={{ color: "var(--text-soft)" }} />;
}

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: "Verbonden",
  disconnected: "Niet verbonden",
  error: "Fout",
};

type Integration = {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  detail: string;
};

async function loadIntegrations(): Promise<Integration[]> {
  // Live Mollie status
  const mollie = await pingMollie();
  const mollieIntegration: Integration = mollie.success
    ? {
        id: "mollie",
        name: "Mollie",
        description: "Betalingen en webhooks",
        status: "connected",
        detail: `${mollie.data.liveMode ? "LIVE" : "Test mode"} · ${mollie.data.methods.join(", ")}`,
      }
    : {
        id: "mollie",
        name: "Mollie",
        description: "Betalingen en webhooks",
        status: "disconnected",
        detail: mollie.error,
      };

  // Neon DB: we're running this query so it's by definition connected
  const neon: Integration = {
    id: "neon",
    name: "Neon Postgres",
    description: "Database",
    status: "connected",
    detail: "ep-broad-bird-all7eegv · eu-central-1",
  };

  // Neon Auth: BASE_URL set ⇒ connected
  const neonAuth: Integration = process.env.NEON_AUTH_BASE_URL
    ? {
        id: "neon-auth",
        name: "Neon Auth",
        description: "Authenticatie (Better Auth)",
        status: "connected",
        detail: "Better Auth via Neon",
      }
    : {
        id: "neon-auth",
        name: "Neon Auth",
        description: "Authenticatie",
        status: "disconnected",
        detail: "NEON_AUTH_BASE_URL ontbreekt",
      };

  // Static placeholders (lights up when we connect them)
  const cloudflare: Integration = {
    id: "cloudflare",
    name: "Cloudflare",
    description: "DNS + CDN (models.dicteren.ai)",
    status: process.env.CLOUDFLARE_API_TOKEN ? "connected" : "error",
    detail: process.env.CLOUDFLARE_API_TOKEN
      ? "API token aanwezig — DNS-record nog niet aangemaakt"
      : "CLOUDFLARE_API_TOKEN ontbreekt",
  };

  const email: Integration = {
    id: "email",
    name: "Email-provider",
    description: "Transactionele e-mail",
    status: "disconnected",
    detail: "Resend/Postmark — keuze nog te maken",
  };

  return [mollieIntegration, neon, neonAuth, cloudflare, email];
}

export default async function AdminSettingsPage() {
  await assertStaffPageAccess("/admin/settings");
  const [integrations, customers, audit] = await Promise.all([
    loadIntegrations(),
    listCustomers(),
    listAuditEvents(20),
  ]);
  const admins = customers.filter((c) => c.role === "admin");
  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">Instellingen</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Integraties, admin-gebruikers en audit-log.
          </p>
        </div>

        <a
          href="/admin/settings/staff"
          className="brand-card flex items-center justify-between p-5 transition-colors hover:bg-[color:var(--bg-deep)]"
        >
          <div>
            <h2 className="text-base font-bold">Staff & rechten</h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Per medewerker page-toegang beperken bovenop hun rol + audit-feed
              van alle handelingen die ze in het platform doen.
            </p>
          </div>
          <span className="text-sm font-semibold text-[color:var(--orange)]">
            Beheren →
          </span>
        </a>

        <section className="brand-card overflow-hidden p-0">
          <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
            <h2 className="text-sm font-bold">Integraties</h2>
          </div>
          <ul>
            {integrations.map((it, i) => (
              <li
                key={it.id}
                className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-[color:var(--border-soft)]" : ""}`}
              >
                <StatusIcon status={it.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{it.name}</h3>
                    <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
                      · {it.description}
                    </span>
                  </div>
                  <div className="text-[0.6875rem] text-[color:var(--text-muted)]">{it.detail}</div>
                </div>
                <div className="shrink-0 text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                  {STATUS_LABEL[it.status]}
                </div>
                <button className="btn btn-secondary btn-sm">
                  {it.status === "connected" ? "Beheer" : "Verbinden"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="brand-card overflow-hidden p-0">
          <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
            <h2 className="text-sm font-bold">Admin-gebruikers</h2>
            <button className="btn btn-secondary btn-sm ml-auto">
              <Plus className="size-3" strokeWidth={2.4} />
              Uitnodigen
            </button>
          </div>
          {admins.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen admins. Maak een gebruiker aan en zet `role = admin` in
              neon_auth.user.
            </div>
          ) : (
            <ul>
              {admins.map((u, i) => (
                <li
                  key={u.id}
                  className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-[color:var(--border-soft)]" : ""}`}
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--navy)" }}
                  >
                    {u.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{u.name}</div>
                    <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                      {u.email}
                    </div>
                  </div>
                  <span className="chip chip-navy gap-1.5 px-2 py-0.5 text-[0.625rem]">
                    {ROLE_LABEL[u.role ?? "user"] ?? u.role}
                  </span>
                  <div className="shrink-0 text-[0.6875rem] text-[color:var(--text-soft)]">
                    Lid sinds {u.createdAt.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="brand-card overflow-hidden p-0">
          <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
            <h2 className="text-sm font-bold">Audit-log</h2>
            <button className="ml-auto text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]">
              Volledige log
            </button>
          </div>
          {audit.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen audit-events vastgelegd.
            </div>
          ) : (
            <ul className="font-mono text-[0.6875rem]">
              {audit.map((e, i) => {
                const action = e.eventType.replace(/^audit\./, "");
                const entity = (e.properties as { entityType?: string })?.entityType;
                const entityId = (e.properties as { entityId?: string })?.entityId;
                return (
                  <li
                    key={e.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-[color:var(--border-soft)]" : ""}`}
                  >
                    <span className="text-[color:var(--text-soft)]">
                      {e.occurredAt.toLocaleString("nl-NL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-semibold text-[color:var(--navy)]">
                      {e.userName ?? "System"}
                    </span>
                    <span className="text-[color:var(--text-muted)]">{action}</span>
                    <span className="truncate">
                      {entity ? `${entity}:${entityId?.slice(0, 8) ?? ""}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
