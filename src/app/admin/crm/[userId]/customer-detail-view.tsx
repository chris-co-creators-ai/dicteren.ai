"use client";

import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  KeyRound,
  Mail,
  MailCheck,
  MailOpen,
  MailX,
  Monitor,
  MousePointerClick,
  ShoppingCart,
  UserCircle,
  XCircle,
} from "lucide-react";

type Summary = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  role: string | null;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  trialStatus: string | null;
  trialLicenseCode: string | null;
  paidLicenseCount: number;
  totalOrders: number;
  totalRevenueCents: number;
  isConverted: boolean;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
};

type TimelineEntry = {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail?: string;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const KIND_META: Record<
  string,
  { icon: typeof UserCircle; color: string; bg: string }
> = {
  account_created: {
    icon: UserCircle,
    color: "var(--navy)",
    bg: "var(--surface-2)",
  },
  trial_started: { icon: Clock, color: "var(--orange-600)", bg: "#fff5ec" },
  license_issued: {
    icon: KeyRound,
    color: "var(--green)",
    bg: "color-mix(in srgb, var(--green) 8%, white)",
  },
  license_activated: { icon: Monitor, color: "var(--navy)", bg: "var(--surface-2)" },
  license_reactivated: {
    icon: Monitor,
    color: "var(--navy)",
    bg: "var(--surface-2)",
  },
  order_created: {
    icon: ShoppingCart,
    color: "var(--navy)",
    bg: "var(--surface-2)",
  },
  order_paid: {
    icon: CreditCard,
    color: "var(--green)",
    bg: "color-mix(in srgb, var(--green) 8%, white)",
  },
  order_refunded: {
    icon: XCircle,
    color: "var(--red)",
    bg: "color-mix(in srgb, var(--red) 8%, white)",
  },
  subscription_canceled: {
    icon: XCircle,
    color: "var(--orange-600)",
    bg: "#fff5ec",
  },
  subscription_past_due: {
    icon: Clock,
    color: "var(--orange-600)",
    bg: "#fff5ec",
  },
  subscription_renewed: {
    icon: CheckCircle2,
    color: "var(--green)",
    bg: "color-mix(in srgb, var(--green) 8%, white)",
  },
  email_sent: { icon: Mail, color: "var(--navy-300)", bg: "var(--surface-2)" },
  email_delivered: {
    icon: MailCheck,
    color: "var(--green)",
    bg: "color-mix(in srgb, var(--green) 8%, white)",
  },
  email_opened: { icon: MailOpen, color: "var(--navy)", bg: "var(--surface-2)" },
  email_clicked: {
    icon: MousePointerClick,
    color: "var(--orange-600)",
    bg: "#fff5ec",
  },
  email_bounced: {
    icon: MailX,
    color: "var(--red)",
    bg: "color-mix(in srgb, var(--red) 8%, white)",
  },
  email_failed: {
    icon: MailX,
    color: "var(--red)",
    bg: "color-mix(in srgb, var(--red) 8%, white)",
  },
};

export function CustomerDetailView({
  summary,
  timeline,
  children,
}: {
  summary: Summary;
  timeline: TimelineEntry[];
  /** Support-cockpit acties, gerenderd tussen de stats en de tijdlijn. */
  children?: ReactNode;
}) {
  const trialActive =
    summary.trialStatus === "active" &&
    summary.trialExpiresAt &&
    new Date(summary.trialExpiresAt).getTime() > Date.now();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{summary.name}</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {summary.email} ·{" "}
            <span className="font-mono">{summary.id.slice(0, 8)}…</span>
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--text-soft)]">
            Account aangemaakt {formatDateTime(summary.createdAt)}
            {summary.emailVerified && " · email geverifieerd"}
            {summary.role === "admin" && " · admin"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trialActive ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
              style={{
                background: "color-mix(in srgb, var(--green) 12%, white)",
                color: "var(--green)",
              }}
            >
              <CheckCircle2 className="size-3" />
              Trial actief
            </span>
          ) : summary.trialStartedAt && !summary.isConverted ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
              style={{
                background: "color-mix(in srgb, var(--orange) 12%, white)",
                color: "var(--orange-600)",
              }}
            >
              <Clock className="size-3" />
              Trial verlopen, niet geconverteerd
            </span>
          ) : null}

          {summary.isConverted && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
              style={{
                background: "color-mix(in srgb, var(--green) 12%, white)",
                color: "var(--green)",
              }}
            >
              <CheckCircle2 className="size-3" />
              Converted
            </span>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Orders"
          value={String(summary.totalOrders)}
          detail={`${formatAmount(summary.totalRevenueCents)} totaal`}
        />
        <Stat
          label="Licenties (betaald)"
          value={String(summary.paidLicenseCount)}
          detail={summary.isConverted ? "Geconverteerd" : "Nog niet"}
        />
        <Stat
          label="Mails verstuurd"
          value={String(summary.emailsSent)}
          detail={`${summary.emailsOpened} geopend · ${summary.emailsClicked} geklikt`}
        />
        <Stat
          label="Bounce / klacht"
          value={String(summary.emailsBounced)}
          detail={summary.emailsBounced > 0 ? "Aandacht" : "Schoon"}
        />
      </div>

      {/* Trial detail */}
      {summary.trialLicenseCode && (
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Trial
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <code className="font-mono text-sm font-bold">
                {summary.trialLicenseCode}
              </code>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                Gestart {summary.trialStartedAt && formatDateTime(summary.trialStartedAt)}{" "}
                · {trialActive ? "loopt tot " : "liep tot "}
                {summary.trialExpiresAt && formatDateTime(summary.trialExpiresAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support-cockpit acties */}
      {children}

      {/* Timeline */}
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-white">
        <div className="border-b border-[color:var(--border-soft)] px-4 py-3 text-sm font-semibold">
          Tijdlijn ({timeline.length})
        </div>
        <ol className="divide-y divide-[color:var(--border-soft)]">
          {timeline.map((e) => {
            const meta = KIND_META[e.kind] ?? {
              icon: Mail,
              color: "var(--navy-300)",
              bg: "var(--surface-2)",
            };
            const Icon = meta.icon;
            return (
              <li key={e.id} className="flex gap-4 px-4 py-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: meta.bg }}
                >
                  <Icon className="size-4" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{e.title}</div>
                  {e.detail && (
                    <div className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                      {e.detail}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-[color:var(--text-muted)]">
                  {formatDateTime(e.at)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-soft)]">
        {detail}
      </div>
    </div>
  );
}
