"use client";

import { useMemo, useState } from "react";
import { Filter, Mail, Search, Send } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";

type EmailRow = {
  id: string;
  resendId: string | null;
  toAddress: string;
  fromAddress: string;
  subject: string;
  category: string;
  status: string;
  errorMessage: string | null;
  errorCode: string | null;
  userName: string | null;
  userEmail: string | null;
  licenseCode: string | null;
  orderId: string | null;
  subscriptionId: string | null;
  sentAt: string;
  deliveredAt: string | null;
  lastEventAt: string | null;
};

type Kpi = { label: string; value: string; detail: string };

const CATEGORY_LABEL: Record<string, string> = {
  license_issued: "Licentie",
  welcome: "Welkom",
  subscription_past_due: "Past_due",
  subscription_canceled: "Opgezegd",
  subscription_renewed: "Verlengd",
  refund: "Refund",
  other: "Overig",
};

const STATUS_META: Record<
  string,
  { label: string; chip: "green" | "amber" | "red" | "neutral" }
> = {
  sent: { label: "Verstuurd", chip: "neutral" },
  delivered: { label: "Afgeleverd", chip: "green" },
  opened: { label: "Geopend", chip: "green" },
  clicked: { label: "Geklikt", chip: "green" },
  bounced: { label: "Bounced", chip: "red" },
  complained: { label: "Spam-klacht", chip: "red" },
  failed: { label: "Mislukt", chip: "amber" },
};

const CHIP_COLOR: Record<string, string> = {
  green: "var(--green)",
  amber: "var(--orange)",
  red: "var(--red)",
  neutral: "var(--navy-300)",
};

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "sent", label: "Verstuurd" },
  { key: "delivered", label: "Afgeleverd" },
  { key: "bounced", label: "Bounced" },
  { key: "failed", label: "Mislukt" },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesTab(row: EmailRow, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "sent") return row.status === "sent";
  if (tab === "delivered")
    return ["delivered", "opened", "clicked"].includes(row.status);
  if (tab === "bounced")
    return ["bounced", "complained"].includes(row.status);
  if (tab === "failed") return row.status === "failed";
  return false;
}

export function EmailsView({
  emails,
  kpis,
  categoryStats,
}: {
  emails: EmailRow[];
  kpis: Kpi[];
  categoryStats: { category: string; count: number }[];
}) {
  const [tab, setTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<EmailRow | null>(null);

  const filtered = useMemo(
    () =>
      emails.filter((r) => {
        if (!matchesTab(r, tab)) return false;
        if (categoryFilter && r.category !== categoryFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.toAddress.toLowerCase().includes(q) ||
            r.subject.toLowerCase().includes(q) ||
            (r.userName?.toLowerCase().includes(q) ?? false) ||
            (r.licenseCode?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      }),
    [tab, categoryFilter, search, emails],
  );

  return (
    <>
      <AdminTopbar />

      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">E-mails</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Wie heeft welke mail ontvangen, met aflever-status van Resend.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4"
            >
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-bold">{k.value}</div>
              <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-soft)]">
                {k.detail}
              </div>
            </div>
          ))}
        </div>

        {categoryStats.length > 0 && (
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4">
            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
              Per categorie — klik om te filteren
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {categoryStats.map((c) => {
                const active = categoryFilter === c.category;
                return (
                  <button
                    key={c.category}
                    onClick={() =>
                      setCategoryFilter(active ? null : c.category)
                    }
                    className={
                      active
                        ? "inline-flex items-center gap-2 rounded-md border border-[color:var(--navy)] bg-[color:var(--navy)] px-2.5 py-1 text-xs text-white"
                        : "inline-flex items-center gap-2 rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-2.5 py-1 text-xs hover:border-[color:var(--navy)]"
                    }
                  >
                    <span className="font-semibold">
                      {CATEGORY_LABEL[c.category] ?? c.category}
                    </span>
                    <span className={active ? "text-white/80" : "text-[color:var(--text-muted)]"}>
                      {c.count}
                    </span>
                  </button>
                );
              })}
              {categoryFilter && (
                <button
                  onClick={() => setCategoryFilter(null)}
                  className="text-xs font-semibold text-[color:var(--text-muted)] underline"
                >
                  Filter wissen
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white p-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? "rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-md px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-2 size-3.5 text-[color:var(--text-muted)]" />
            <input
              type="text"
              placeholder="Zoek op email, onderwerp, naam, licentie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[color:var(--border-soft)] bg-white py-1.5 pl-8 pr-3 text-xs"
            />
          </div>
          <span className="text-xs text-[color:var(--text-muted)]">
            {filtered.length} van {emails.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--surface-2)] text-left">
              <tr className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                <th className="px-4 py-3">Ontvanger</th>
                <th className="px-4 py-3">Onderwerp</th>
                <th className="px-4 py-3">Categorie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verzonden</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-[color:var(--text-muted)]"
                  >
                    <Mail className="mx-auto mb-2 size-6 opacity-40" />
                    Nog geen mails verstuurd.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const meta = STATUS_META[r.status] ?? {
                    label: r.status,
                    chip: "neutral" as const,
                  };
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDrawer(r)}
                      className="cursor-pointer border-t border-[color:var(--border-soft)] hover:bg-[color:var(--surface-2)]"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {r.userName ?? r.toAddress}
                        </div>
                        {r.userName && (
                          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                            {r.toAddress}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="line-clamp-1">{r.subject}</div>
                        {r.licenseCode && (
                          <code className="mt-0.5 inline-block font-mono text-[0.6875rem] text-[color:var(--text-muted)]">
                            {r.licenseCode}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {CATEGORY_LABEL[r.category] ?? r.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold"
                          style={{
                            background: `color-mix(in srgb, ${CHIP_COLOR[meta.chip]} 12%, white)`,
                            color: CHIP_COLOR[meta.chip],
                          }}
                        >
                          <span
                            className="inline-block size-1.5 rounded-full"
                            style={{ background: CHIP_COLOR[meta.chip] }}
                          />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                        {formatDateTime(r.sentAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <EmailDrawer email={drawer} onClose={() => setDrawer(null)} />
      )}
    </>
  );
}

function EmailDrawer({
  email,
  onClose,
}: {
  email: EmailRow;
  onClose: () => void;
}) {
  const meta = STATUS_META[email.status] ?? {
    label: email.status,
    chip: "neutral" as const,
  };
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);

  async function resend() {
    setResending(true);
    setResendStatus(null);
    try {
      const res = await fetch(`/api/admin/emails/${email.id}/resend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        setResendStatus({ kind: "error", message: data.error ?? "Mislukt" });
      } else {
        setResendStatus({
          kind: "ok",
          message: `Verstuurd. Nieuwe Resend-id: ${data.newResendId.slice(0, 12)}…`,
        });
      }
    } catch {
      setResendStatus({ kind: "error", message: "Netwerkprobleem" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--border-soft)] bg-white p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
              {CATEGORY_LABEL[email.category] ?? email.category}
            </div>
            <h2 className="mt-1 text-lg font-bold">{email.subject}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[color:var(--text-muted)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--orange)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            <Send className="size-3.5" strokeWidth={2.4} />
            {resending ? "Bezig…" : "Mail opnieuw versturen"}
          </button>
          {resendStatus && (
            <div
              className={
                "mt-2 rounded-md border p-2 text-xs " +
                (resendStatus.kind === "ok"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700")
              }
            >
              {resendStatus.message}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <Field
            label="Status"
            value={
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
                style={{
                  background: `color-mix(in srgb, ${CHIP_COLOR[meta.chip]} 12%, white)`,
                  color: CHIP_COLOR[meta.chip],
                }}
              >
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ background: CHIP_COLOR[meta.chip] }}
                />
                {meta.label}
              </span>
            }
          />
          <Field label="Naar" value={email.toAddress} />
          {email.userName && <Field label="Klant" value={email.userName} />}
          <Field label="Van" value={email.fromAddress} />
          <Field label="Verzonden" value={formatDateTime(email.sentAt)} />
          {email.deliveredAt && (
            <Field
              label="Afgeleverd"
              value={formatDateTime(email.deliveredAt)}
            />
          )}
          {email.errorMessage && (
            <div className="rounded-lg border border-[color:var(--red)]/30 bg-[color:var(--red)]/5 p-3 text-xs">
              <div className="font-semibold text-[color:var(--red)]">
                Foutmelding{email.errorCode ? ` · ${email.errorCode}` : ""}
              </div>
              <div className="mt-1 text-[color:var(--text)]">
                {email.errorMessage}
              </div>
            </div>
          )}
          {email.licenseCode && (
            <Field
              label="Licentie"
              value={
                <code className="font-mono">{email.licenseCode}</code>
              }
            />
          )}
          {email.orderId && (
            <Field label="Order" value={email.orderId.slice(0, 8) + "…"} />
          )}
          {email.subscriptionId && (
            <Field
              label="Abonnement"
              value={email.subscriptionId.slice(0, 8) + "…"}
            />
          )}
          {email.resendId && (
            <Field
              label="Resend ID"
              value={<code className="font-mono text-[0.6875rem]">{email.resendId}</code>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
