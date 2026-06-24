"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Gift } from "lucide-react";
import type { ReferralOverview } from "@/lib/services/referral";

type Tab = "uitnodigen" | "eerdere" | "code";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VriendenClient({
  overview,
  link,
  firstName,
}: {
  overview: ReferralOverview;
  link: string;
  firstName: string;
}) {
  const [tab, setTab] = useState<Tab>("uitnodigen");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--navy)]">
        Vrienden uitnodigen
      </h1>
      {(overview.appliedMonths > 0 || overview.pendingMonths > 0) && (
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          {overview.appliedMonths > 0 && (
            <>Je verdiende al {overview.appliedMonths} gratis{" "}
              {overview.appliedMonths === 1 ? "maand" : "maanden"}. </>
          )}
          {overview.pendingMonths > 0 && (
            <>Nog {overview.pendingMonths} onderweg.</>
          )}
        </p>
      )}

      <div className="mt-5 flex gap-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-1 text-sm">
        {(
          [
            { key: "uitnodigen", label: "Uitnodigen" },
            { key: "eerdere", label: `Eerdere uitnodigingen${overview.referrals.length ? ` (${overview.referrals.length})` : ""}` },
            { key: "code", label: "Code invoeren" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-[color:var(--navy)] shadow-sm"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "uitnodigen" && (
          <UitnodigenTab link={link} firstName={firstName} />
        )}
        {tab === "eerdere" && <EerdereTab referrals={overview.referrals} />}
        {tab === "code" && <CodeTab />}
      </div>
    </main>
  );
}

function UitnodigenTab({ link, firstName }: { link: string; firstName: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard niet beschikbaar — gebruiker kan handmatig selecteren
    }
  };

  const mailtoBody = `Hoi,\n\nIk gebruik Dicteren.ai om te praten in plaats van te typen. Probeer het via mijn link, dan krijgen we allebei een maand gratis:\n${link}\n`;
  const mailto = `mailto:?subject=${encodeURIComponent(
    "Probeer Dicteren.ai (we krijgen allebei een maand gratis)",
  )}&body=${encodeURIComponent(mailtoBody)}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
        <h2 className="text-lg font-bold text-[color:var(--navy)]">
          Nodig een vriend uit. Jullie krijgen allebei een maand gratis.
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-[color:var(--text-muted)]">
          <li>1. Deel je link met een vriend.</li>
          <li>2. Je vriend probeert Dicteren.ai en krijgt een maand gratis.</li>
          <li>3. Wordt je vriend klant? Dan krijg jij ook een maand gratis.</li>
        </ol>

        {/* Gift-card */}
        <div className="mt-5 rounded-xl bg-[color:var(--navy)] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Gift className="size-4" strokeWidth={2.2} />
            <span className="text-sm font-bold">Dicteren.ai</span>
          </div>
          <div className="mt-1 text-lg font-bold">1 maand gratis</div>
          {firstName && (
            <div className="text-xs opacity-80">van {firstName}</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
        <div className="text-xs font-semibold text-[color:var(--text)]">
          Jouw uitnodigingslink
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-[color:var(--bg)] px-3 py-2 font-mono text-xs">
            {link}
          </code>
          <button
            type="button"
            onClick={copy}
            className="btn btn-primary"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={2.4} />
            ) : (
              <Copy className="size-3.5" strokeWidth={2.2} />
            )}
            {copied ? "Gekopieerd" : "Kopieer"}
          </button>
        </div>
        <a
          href={mailto}
          className="mt-3 inline-block text-sm font-semibold text-[color:var(--navy)] underline underline-offset-2"
        >
          Of stuur een uitnodiging via e-mail →
        </a>
      </div>
    </div>
  );
}

function EerdereTab({
  referrals,
}: {
  referrals: ReferralOverview["referrals"];
}) {
  if (referrals.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-8 text-center text-sm text-[color:var(--text-muted)]">
        Nog geen uitnodigingen. Deel je link, dan staat je eerste gratis maand zo
        klaar.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-[color:var(--border-soft)] rounded-2xl border border-[color:var(--border-soft)] bg-white">
      {referrals.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[color:var(--text)]">
              {r.email ?? "Je vriend"}
            </div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {fmt(r.createdAt)}
            </div>
          </div>
          <StatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: "pending" | "qualified" | "void" }) {
  if (status === "qualified") {
    return (
      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-[color:var(--green)]" style={{ background: "#e8f5ee" }}>
        Klant geworden
      </span>
    );
  }
  if (status === "void") {
    return (
      <span className="shrink-0 rounded-full bg-[color:var(--bg)] px-2.5 py-1 text-xs font-semibold text-[color:var(--text-soft)]">
        Vervallen
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-[color:var(--bg)] px-2.5 py-1 text-xs font-semibold text-[color:var(--text-muted)]">
      Aangemeld
    </span>
  );
}

function CodeTab() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ ok: true, text: "Gelukt. We zetten je gratis maand op je licentie." });
        setCode("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: data.error ?? "Er ging iets mis." });
      }
    } catch {
      setMsg({ ok: false, text: "Er ging iets mis. Probeer het opnieuw." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6"
    >
      <h2 className="text-lg font-bold text-[color:var(--navy)]">
        Een vriend uitgenodigd? Vul de code in.
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Uitnodigingscode"
          className="flex-1 rounded-lg border border-[color:var(--border-soft)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--orange)]"
        />
        <button type="submit" disabled={busy} className="btn btn-primary">
          Toepassen
        </button>
      </div>
      {msg && (
        <p
          className={`mt-3 text-sm font-medium ${
            msg.ok ? "text-[color:var(--green,#1f8a4c)]" : "text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}
