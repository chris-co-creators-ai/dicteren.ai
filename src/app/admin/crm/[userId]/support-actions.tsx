"use client";

// Dicteren.ai — Support-cockpit acties (fase 3).
//
// Toont per klant de actionable entiteiten en de bijspring-knoppen die op de
// fase-2-routes draaien. Alle acties: optimistische status-melding + refresh.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Key,
  Monitor,
  RefreshCw,
  Receipt,
  RotateCcw,
  Mail,
  XCircle,
} from "lucide-react";

type Activation = {
  activationId: string;
  deviceId: string;
  fingerprint: string;
  platform: string | null;
  appVersion: string | null;
  isActive: boolean;
  activatedAt: string;
  lastSeenAt: string | null;
};
type SupportLicense = {
  id: string;
  code: string;
  type: string;
  status: string;
  source: string | null;
  planLabel: string | null;
  period: string | null;
  seats: number;
  maxActivationsPerSeat: number;
  expiresAt: string | null;
  organizationId: string | null;
  orderId: string | null;
  activeDeviceCount: number;
  deviceLimit: number;
  activations: Activation[];
};
type SupportOrder = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  planLabel: string | null;
  molliePaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  hasLicense: boolean;
};
type SupportSubscription = {
  id: string;
  status: string;
  mollieSubscriptionId: string;
  amountCents: number;
  currency: string;
  seats: number;
  nextBillingAt: string | null;
  licenseId: string | null;
};
type SupportEmail = {
  id: string;
  category: string;
  subject: string;
  status: string;
  toAddress: string;
  sentAt: string;
  resendId: string | null;
};
type SupportMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
};

export type SupportSnapshot = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    emailVerified: boolean;
    createdAt: string;
    mollieCustomerId: string | null;
  };
  licenses: SupportLicense[];
  orders: SupportOrder[];
  subscriptions: SupportSubscription[];
  emails: SupportEmail[];
  memberships: SupportMembership[];
};

const LICENSE_STATUSES = [
  "active",
  "trial",
  "past_due",
  "canceled",
  "expired",
  "revoked",
] as const;

const RESENDABLE = new Set([
  "license_issued",
  "welcome",
  "trial_started",
  "subscription_past_due",
  "subscription_canceled",
  "subscription_renewed",
  "refund",
]);

function fmtAmount(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(
    cents / 100,
  );
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SupportActions({ snapshot }: { snapshot: SupportSnapshot }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function run(
    key: string,
    url: string,
    body?: Record<string, unknown>,
    okText = "Gelukt",
  ) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setMsg({ kind: "ok", text: okText });
        startTransition(() => router.refresh());
      } else {
        setMsg({
          kind: "err",
          text: data.error ?? `Mislukt (${res.status})`,
        });
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{
            background:
              msg.kind === "ok"
                ? "color-mix(in srgb, var(--green) 12%, white)"
                : "color-mix(in srgb, var(--red) 12%, white)",
            color: msg.kind === "ok" ? "var(--green)" : "var(--red)",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Licenties + apparaten */}
      <Section icon={Key} title={`Licenties (${snapshot.licenses.length})`}>
        {snapshot.licenses.length === 0 ? (
          <Empty>Geen licenties.</Empty>
        ) : (
          <div className="space-y-3">
            {snapshot.licenses.map((l) => (
              <LicenseCard
                key={l.id}
                license={l}
                busy={busy}
                run={run}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Orders */}
      <Section icon={Receipt} title={`Orders (${snapshot.orders.length})`}>
        {snapshot.orders.length === 0 ? (
          <Empty>Geen orders.</Empty>
        ) : (
          <div className="divide-y divide-[color:var(--border-soft)]">
            {snapshot.orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {o.planLabel ?? "Order"} · {fmtAmount(o.amountCents, o.currency)}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)]">
                    {o.status} · {fmtDate(o.createdAt)}
                    {o.status === "paid" && !o.hasLicense && (
                      <span style={{ color: "var(--red)" }}>
                        {" "}
                        · betaald zonder licentie
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {o.status === "paid" && !o.hasLicense && (
                    <BtnPrimary
                      busy={busy === `fulfill:${o.id}`}
                      onClick={() =>
                        run(
                          `fulfill:${o.id}`,
                          `/api/admin/orders/${o.id}/fulfill`,
                          undefined,
                          "Licentie uitgegeven",
                        )
                      }
                    >
                      Geef licentie uit
                    </BtnPrimary>
                  )}
                  {o.status === "paid" && (
                    <BtnGhost
                      busy={busy === `refund:${o.id}`}
                      onClick={() => {
                        if (
                          !confirm(
                            `Volledige refund van ${fmtAmount(o.amountCents, o.currency)}? Mollie start het terugbetaalproces.`,
                          )
                        )
                          return;
                        run(
                          `refund:${o.id}`,
                          `/api/admin/orders/${o.id}/refund`,
                          {},
                          "Refund gestart",
                        );
                      }}
                    >
                      Refund
                    </BtnGhost>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Abonnementen */}
      <Section
        icon={RefreshCw}
        title={`Abonnementen (${snapshot.subscriptions.length})`}
      >
        {snapshot.subscriptions.length === 0 ? (
          <Empty>Geen abonnementen.</Empty>
        ) : (
          <div className="divide-y divide-[color:var(--border-soft)]">
            {snapshot.subscriptions.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {fmtAmount(s.amountCents, s.currency)} · {s.seats}{" "}
                    {s.seats === 1 ? "seat" : "seats"}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)]">
                    {s.status} · volgende incasso {fmtDate(s.nextBillingAt)}
                  </div>
                </div>
                {s.status !== "canceled" && (
                  <BtnGhost
                    busy={busy === `subcancel:${s.id}`}
                    onClick={() => {
                      if (!confirm("Abonnement opzeggen namens deze klant?"))
                        return;
                      run(
                        `subcancel:${s.id}`,
                        `/api/admin/subscriptions/${s.id}/cancel`,
                        undefined,
                        "Abonnement opgezegd",
                      );
                    }}
                  >
                    <XCircle className="size-3.5" />
                    Opzeggen
                  </BtnGhost>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Mails */}
      <Section icon={Mail} title={`Recente mails (${snapshot.emails.length})`}>
        {snapshot.emails.length === 0 ? (
          <Empty>Geen mails.</Empty>
        ) : (
          <div className="divide-y divide-[color:var(--border-soft)]">
            {snapshot.emails.slice(0, 12).map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {e.subject}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)]">
                    {e.category} · {e.status} · {fmtDate(e.sentAt)}
                  </div>
                </div>
                {RESENDABLE.has(e.category) && (
                  <BtnGhost
                    busy={busy === `resend:${e.id}`}
                    onClick={() =>
                      run(
                        `resend:${e.id}`,
                        `/api/admin/emails/${e.id}/resend`,
                        undefined,
                        "Mail opnieuw verstuurd",
                      )
                    }
                  >
                    Opnieuw
                  </BtnGhost>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Organisaties */}
      {snapshot.memberships.length > 0 && (
        <Section
          icon={Building2}
          title={`Organisaties (${snapshot.memberships.length})`}
        >
          <div className="divide-y divide-[color:var(--border-soft)]">
            {snapshot.memberships.map((m) => (
              <div
                key={m.organizationId}
                className="flex items-center justify-between gap-2 py-2.5"
              >
                <div className="text-sm font-semibold">
                  {m.organizationName}{" "}
                  <span className="text-xs font-normal text-[color:var(--text-muted)]">
                    ({m.role})
                  </span>
                </div>
                <Link
                  href={`/admin/organizations/${m.organizationId}`}
                  className="text-xs font-semibold text-[color:var(--navy)] underline-offset-2 hover:underline"
                >
                  Open organisatie
                </Link>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function LicenseCard({
  license: l,
  busy,
  run,
}: {
  license: SupportLicense;
  busy: string | null;
  run: (
    key: string,
    url: string,
    body?: Record<string, unknown>,
    okText?: string,
  ) => void;
}) {
  const [status, setStatus] = useState(l.status);
  const [months, setMonths] = useState(0);
  const recurring = l.period && l.period !== "lifetime";

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <code className="font-mono text-sm font-bold">{l.code}</code>
          <div className="text-xs text-[color:var(--text-muted)]">
            {l.type} · {l.planLabel ?? l.period ?? "—"} · status {l.status} ·
            verloopt {fmtDate(l.expiresAt)} · {l.activeDeviceCount}/{l.deviceLimit}{" "}
            apparaten
          </div>
        </div>
      </div>

      {/* Apparaten */}
      {l.activations.length > 0 && (
        <div className="mt-2 space-y-1 rounded-lg bg-[color:var(--surface-2)] p-2">
          {l.activations.map((a) => (
            <div
              key={a.activationId}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="size-3.5 text-[color:var(--text-muted)]" />
                {a.platform ?? "onbekend"} · {a.fingerprint.slice(0, 14)} ·{" "}
                {a.isActive ? "actief" : "uit"} · gezien {fmtDate(a.lastSeenAt)}
              </span>
              {a.isActive && (
                <BtnGhost
                  busy={busy === `deact:${a.activationId}`}
                  onClick={() =>
                    run(
                      `deact:${a.activationId}`,
                      `/api/admin/activations/${a.activationId}/deactivate`,
                      { reason: "support" },
                      "Apparaat gedeactiveerd",
                    )
                  }
                >
                  Deactiveer
                </BtnGhost>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Acties */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--border-soft)] px-2 py-1 text-xs"
        >
          {LICENSE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="w-16 rounded-md border border-[color:var(--border-soft)] px-2 py-1 text-xs"
          title="Maanden verlengen"
        />
        <span className="text-xs text-[color:var(--text-muted)]">mnd</span>
        <BtnGhost
          busy={busy === `override:${l.id}`}
          onClick={() =>
            run(
              `override:${l.id}`,
              `/api/admin/licenses/${l.id}/override`,
              {
                setStatus: status !== l.status ? status : undefined,
                extendMonths: months !== 0 ? months : undefined,
                reason: "support-cockpit",
              },
              "Licentie bijgewerkt",
            )
          }
        >
          Toepassen
        </BtnGhost>

        {recurring && (
          <BtnGhost
            busy={busy === `retrysub:${l.id}`}
            onClick={() =>
              run(
                `retrysub:${l.id}`,
                `/api/admin/licenses/${l.id}/retry-subscription`,
                undefined,
                "Auto-renew hersteld",
              )
            }
          >
            <RotateCcw className="size-3.5" />
            Herstel auto-renew
          </BtnGhost>
        )}

        <BtnGhost
          busy={busy === `replace:${l.id}`}
          onClick={() => {
            if (!confirm("Oude code intrekken en een nieuwe mailen?")) return;
            run(
              `replace:${l.id}`,
              `/api/admin/licenses/${l.id}/replace`,
              { reason: "support-cockpit" },
              "Licentie vervangen + gemaild",
            );
          }}
        >
          Vervang
        </BtnGhost>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Key;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-white">
      <div className="flex items-center gap-2 border-b border-[color:var(--border-soft)] px-4 py-3 text-sm font-semibold">
        <Icon className="size-4 text-[color:var(--text-muted)]" />
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-[color:var(--text-muted)]">{children}</div>
  );
}

function BtnPrimary({
  busy,
  onClick,
  children,
}: {
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
    >
      {busy ? "Bezig…" : children}
    </button>
  );
}

function BtnGhost({
  busy,
  onClick,
  children,
}: {
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--navy)] hover:bg-[color:var(--surface-2)] disabled:opacity-50"
    >
      {busy ? "Bezig…" : children}
    </button>
  );
}
