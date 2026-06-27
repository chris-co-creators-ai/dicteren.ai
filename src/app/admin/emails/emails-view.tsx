"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Clock,
  Coins,
  Handshake,
  KeyRound,
  Mail,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// Groep = kleur + icoon, zodat de kaarten in één oogopslag te scannen zijn.
const GROUP_META: Record<string, { color: string; icon: LucideIcon }> = {
  trial: { color: "var(--aqua)", icon: Clock },
  license: { color: "var(--green)", icon: KeyRound },
  welcome: { color: "var(--aqua)", icon: Sparkles },
  affiliate: { color: "var(--orange)", icon: Coins },
  partner: { color: "var(--green)", icon: Handshake },
  org: { color: "var(--navy)", icon: Building2 },
  other: { color: "var(--navy-300)", icon: Mail },
};

// Per mail-soort: leesbare naam + wat de mail is + groep. De omschrijving is
// admin-intern (geen klant-copy) maar wel B1/helder.
const CATEGORY_META: Record<
  string,
  { label: string; description: string; group: keyof typeof GROUP_META }
> = {
  trial_started: {
    label: "Proef gestart",
    description: "Bevestiging zodra iemand een gratis proef start.",
    group: "trial",
  },
  trial_reminder_d7: {
    label: "Proef-herinnering dag 7",
    description: "Herinnering halverwege de proefperiode.",
    group: "trial",
  },
  trial_reminder_d13: {
    label: "Proef-herinnering dag 13",
    description: "Laatste duwtje vlak voor de proef afloopt.",
    group: "trial",
  },
  trial_expired: {
    label: "Proef afgelopen",
    description: "Bericht dat de proefperiode is verlopen.",
    group: "trial",
  },
  license_issued: {
    label: "Licentie verstuurd",
    description: "Licentiecode na een aankoop.",
    group: "license",
  },
  welcome: {
    label: "Welkom",
    description: "Welkomstmail bij een nieuw account.",
    group: "welcome",
  },
  affiliate_first_commission: {
    label: "Eerste commissie",
    description: "Melding bij de eerste commissie van een affiliate.",
    group: "affiliate",
  },
  affiliate_payout_scheduled: {
    label: "Uitbetaling ingepland",
    description: "Affiliate-commissie staat klaar voor uitbetaling.",
    group: "affiliate",
  },
  affiliate_payout_paid: {
    label: "Uitbetaling gedaan",
    description: "Affiliate-commissie is uitbetaald.",
    group: "affiliate",
  },
  affiliate_approved: {
    label: "Affiliate goedgekeurd",
    description: "Aanmelding als affiliate is geaccepteerd.",
    group: "affiliate",
  },
  partner_deck: {
    label: "Partnerdeck",
    description: "Reseller-deck verstuurd naar een partner.",
    group: "partner",
  },
  partner_welcome: {
    label: "Partner welkom",
    description: "Welkomstmail zodra een reseller partner wordt.",
    group: "partner",
  },
  brand_identity_request: {
    label: "Brand-identity opgevraagd",
    description: "Vraag om logo, kleuren en tekst voor de partnerpagina.",
    group: "partner",
  },
  org_subscription_canceled: {
    label: "Zakelijk opgezegd",
    description: "Een zakelijk abonnement is opgezegd.",
    group: "org",
  },
  org_tier_changed: {
    label: "Staffel gewijzigd",
    description: "De prijsstaffel van een organisatie is aangepast.",
    group: "org",
  },
  org_member_welcome: {
    label: "Teamlid welkom",
    description: "Welkom voor een nieuw teamlid in een organisatie.",
    group: "org",
  },
  org_seats_expanded: {
    label: "Seats uitgebreid",
    description: "Een organisatie heeft seats bijgekocht.",
    group: "org",
  },
  org_member_removed: {
    label: "Teamlid verwijderd",
    description: "Een teamlid is uit de organisatie gehaald.",
    group: "org",
  },
  org_owner_joined: {
    label: "Eigenaar toegevoegd",
    description: "Een nieuwe eigenaar is aan de organisatie toegevoegd.",
    group: "org",
  },
  org_owner_left: {
    label: "Eigenaar vertrokken",
    description: "Een eigenaar heeft de organisatie verlaten.",
    group: "org",
  },
  org_invite_reminder: {
    label: "Uitnodiging-herinnering",
    description: "Herinnering voor een openstaande team-uitnodiging.",
    group: "org",
  },
  org_seats_reduced: {
    label: "Seats verlaagd",
    description: "Een organisatie heeft het aantal seats verlaagd.",
    group: "org",
  },
  org_device_revoked: {
    label: "Apparaat ingetrokken",
    description: "Toegang van een apparaat is ingetrokken.",
    group: "org",
  },
  other: {
    label: "Overig",
    description: "Mails zonder vaste categorie.",
    group: "other",
  },
};

function catLabel(category: string): string {
  return (
    CATEGORY_META[category]?.label ??
    category.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

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

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
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
  categoryStats: {
    category: string;
    count: number;
    delivered: number;
    problems: number;
    lastSentAt: string | null;
  }[];
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
          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">Per soort mail</h2>
                <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
                  Klik een kaart om de lijst hieronder te filteren.
                </p>
              </div>
              {categoryFilter && (
                <button
                  onClick={() => setCategoryFilter(null)}
                  className="shrink-0 text-xs font-semibold text-[color:var(--text-muted)] underline hover:text-[color:var(--navy)]"
                >
                  Filter wissen
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categoryStats.map((c) => {
                const active = categoryFilter === c.category;
                const meta = CATEGORY_META[c.category];
                const group = GROUP_META[meta?.group ?? "other"];
                const Icon = group.icon;
                const deliveredPct =
                  c.count > 0
                    ? Math.round((c.delivered / c.count) * 100)
                    : 0;
                return (
                  <button
                    key={c.category}
                    onClick={() =>
                      setCategoryFilter(active ? null : c.category)
                    }
                    title={active ? "Klik om filter te wissen" : "Filter op dit soort mail"}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border bg-white p-3 text-left transition-all hover:shadow-sm",
                      active
                        ? "border-[color:var(--navy)] ring-1 ring-[color:var(--navy)]"
                        : "border-[color:var(--border-soft)] hover:border-[color:var(--navy)]/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-lg"
                          style={{
                            background: `color-mix(in srgb, ${group.color} 14%, white)`,
                            color: group.color,
                          }}
                        >
                          <Icon className="size-3.5" strokeWidth={2.2} />
                        </span>
                        <span className="truncate text-sm font-semibold">
                          {catLabel(c.category)}
                        </span>
                      </div>
                      <span className="shrink-0 text-lg font-bold tabular-nums leading-none">
                        {c.count}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-[0.6875rem] leading-snug text-[color:var(--text-muted)]">
                      {meta?.description ?? "Mail zonder vaste categorie."}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-[color:var(--border-soft)] pt-2 text-[0.625rem]">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-[color:var(--green)]">
                          {deliveredPct}%
                        </span>
                        <span className="text-[color:var(--text-soft)]">
                          afgeleverd
                        </span>
                        {c.problems > 0 && (
                          <span className="ml-0.5 rounded bg-[color:var(--red)]/10 px-1 font-semibold text-[color:var(--red)]">
                            {c.problems} mis
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[color:var(--text-soft)]">
                        {c.lastSentAt ? formatDateShort(c.lastSentAt) : "—"}
                      </span>
                    </div>
                  </button>
                );
              })}
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
                        {catLabel(r.category)}
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
              {catLabel(email.category)}
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
