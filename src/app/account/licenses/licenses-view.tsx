"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";

type License = {
  id: string;
  code: string;
  type: string;
  status: string;
  seats: number;
  maxActivationsPerSeat: number;
  activeActivations: number;
  planLabel: string | null;
  issuedAt: string;
  expiresAt: string | null;
};

const STATUS_META: Record<
  string,
  { label: string; tone: "good" | "warn" | "bad" | "neutral" }
> = {
  active: { label: "Actief", tone: "good" },
  trial: { label: "Trial", tone: "neutral" },
  past_due: { label: "Betaling mislukt", tone: "warn" },
  canceled: { label: "Opgezegd", tone: "neutral" },
  expired: { label: "Verlopen", tone: "warn" },
  refunded: { label: "Terugbetaald", tone: "bad" },
  revoked: { label: "Ingetrokken", tone: "bad" },
};

const TONE_COLOR: Record<string, string> = {
  good: "var(--green)",
  warn: "var(--orange)",
  bad: "var(--red)",
  neutral: "var(--text-muted)",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LicensesView({ licenses }: { licenses: License[] }) {
  if (licenses.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Mijn licenties</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Je hebt nog geen licentie. Bestel er een om Dicteren.ai te gebruiken.
        </p>
        <Link href="/prijzen" className="btn btn-primary mt-6 inline-flex">
          Bekijk de prijzen
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Mijn licenties</h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Hier zie je alle licenties die aan jouw account zijn gekoppeld.
      </p>

      <div className="mt-8 space-y-4">
        {licenses.map((l) => (
          <LicenseCard key={l.id} license={l} />
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
        <div className="text-sm font-semibold">App nog niet geïnstalleerd?</div>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Download Dicteren.ai en plak je licentiecode bij de eerste start.
        </p>
        <Link href="/download" className="btn btn-secondary mt-3 inline-flex">
          <Download className="size-3.5" strokeWidth={2.2} />
          Download de app
        </Link>
      </div>
    </main>
  );
}

function LicenseCard({ license }: { license: License }) {
  const meta = STATUS_META[license.status] ?? {
    label: license.status,
    tone: "neutral" as const,
  };
  const maxDevices = license.seats * license.maxActivationsPerSeat;

  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            {license.planLabel ?? license.type}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <code
              className="font-mono text-lg font-bold tracking-tight"
              style={{ color: "var(--navy)" }}
            >
              {license.code}
            </code>
            <CopyButton value={license.code} />
          </div>
        </div>
        <StatusChip label={meta.label} tone={meta.tone} />
      </div>

      <div className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-[color:var(--text-muted)]">Geldig tot</div>
          <div className="mt-0.5 font-semibold">{formatDate(license.expiresAt)}</div>
        </div>
        <div>
          <div className="text-[color:var(--text-muted)]">Apparaten in gebruik</div>
          <div className="mt-0.5 font-semibold">
            {license.activeActivations} / {maxDevices}
          </div>
        </div>
        <div>
          <div className="text-[color:var(--text-muted)]">Aangeschaft</div>
          <div className="mt-0.5 font-semibold">{formatDate(license.issuedAt)}</div>
        </div>
      </div>

      {(license.status === "past_due" || license.status === "expired") && (
        <div
          className="mt-5 rounded-lg border px-4 py-3 text-xs"
          style={{
            background: "color-mix(in srgb, var(--orange) 6%, white)",
            borderColor: "color-mix(in srgb, var(--orange) 25%, white)",
            color: "var(--text)",
          }}
        >
          {license.status === "past_due"
            ? "Je laatste betaling is mislukt. Werk je betaalgegevens bij om door te gaan."
            : "Je licentie is verlopen. Verleng om Dicteren.ai te blijven gebruiken."}
          <div className="mt-2">
            <Link
              href="/account/billing"
              className="font-semibold underline hover:no-underline"
              style={{ color: "var(--orange-600)" }}
            >
              Naar facturering →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const color = TONE_COLOR[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 12%, white)`,
        color,
      }}
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-[0.6875rem] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}
