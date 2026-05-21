import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Download, Mail } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  claimTrialForUser,
  logEvent,
  sendTrialStartedEmail,
  trackEvent,
} from "@/lib/services";
import { CopyButtonClient } from "@/app/checkout/success/copy-button-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Start je gratis trial · Dicteren.ai" };

export default async function TrialStartPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-up?next=/trial/start");
  }

  // Claim trial server-side. Same logic as POST /api/license/trial but
  // inlined so this page is one round-trip and can render result inline.
  const result = await claimTrialForUser({ userId: session.user.id });

  if (!result.success) {
    return (
      <TrialShell>
        <div className="mb-6 inline-flex items-center gap-2 text-[color:var(--orange-600)]">
          <Clock className="size-7" strokeWidth={2} />
          <span className="text-sm font-bold uppercase tracking-[0.05em]">
            Trial niet beschikbaar
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {result.code === "trial_already_used"
            ? "Je hebt je proefperiode al gebruikt"
            : "Trial niet beschikbaar"}
        </h1>
        <p className="mt-3 text-base text-[color:var(--text-muted)]">
          {result.error}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/prijzen" className="btn btn-primary">
            Bekijk de prijzen
          </Link>
          <Link href="/account" className="btn btn-secondary">
            Naar mijn account
          </Link>
        </div>
      </TrialShell>
    );
  }

  const { license, isExisting } = result;

  // First-time claim → send the trial start email.
  if (!isExisting && license.expiresAt) {
    const mail = await sendTrialStartedEmail({
      to: session.user.email,
      name: session.user.name,
      licenseCode: license.code,
      expiresAt: license.expiresAt,
      userId: session.user.id,
      licenseId: license.id,
    });
    if (!mail.success) {
      console.warn("[trial] start mail failed", mail.error, mail.code);
    }
    await logEvent({
      action: "license.created",
      entityType: "license",
      entityId: license.id,
      actorId: session.user.id,
      metadata: { kind: "trial", expiresAt: license.expiresAt.toISOString() },
    });
    await trackEvent("trial_claimed", { isExisting: false });
  }

  const daysLeft = license.expiresAt
    ? Math.max(
        0,
        Math.ceil((license.expiresAt.getTime() - Date.now()) / 86_400_000),
      )
    : 14;

  return (
    <TrialShell>
      <div className="mb-6 inline-flex items-center gap-2 text-[color:var(--green)]">
        <CheckCircle2 className="size-7" strokeWidth={2} />
        <span className="text-sm font-bold uppercase tracking-[0.05em]">
          {isExisting ? "Trial loopt al" : "Trial gestart"}
        </span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {isExisting
          ? "Welkom terug"
          : "Je 14 dagen Dicteren.ai zijn begonnen"}
      </h1>
      <p className="mt-3 text-base text-[color:var(--text-muted)]">
        Nog <strong>{daysLeft} {daysLeft === 1 ? "dag" : "dagen"}</strong> over
        — tot{" "}
        {license.expiresAt?.toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        . We hebben je code ook gemaild naar {session.user.email}.
      </p>

      <div className="mt-7 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Je trial-code
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code
            className="font-mono text-xl font-bold tracking-tight"
            style={{ color: "var(--navy)" }}
          >
            {license.code}
          </code>
          <CopyButtonClient value={license.code} />
        </div>
        <div className="mt-3 text-xs text-[color:var(--text-muted)]">
          Geldig tot{" "}
          {license.expiresAt?.toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · 1 apparaat
        </div>
      </div>

      <ol className="mt-7 space-y-2 text-sm text-[color:var(--text-muted)]">
        <li>
          1. Download Dicteren.ai op{" "}
          <Link href="/download" className="font-semibold text-[color:var(--navy)] underline">
            dicteren.ai/download
          </Link>
        </li>
        <li>2. Open de app — je krijgt direct het activatiescherm</li>
        <li>3. Plak je code hierboven</li>
      </ol>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/download" className="btn btn-primary">
          <Download className="size-3.5" strokeWidth={2.2} />
          Download de app
        </Link>
        <a href={`mailto:${session.user.email}`} className="btn btn-secondary">
          <Mail className="size-3.5" strokeWidth={2.2} />
          Open mijn inbox
        </a>
      </div>

      <p className="mt-8 text-xs text-[color:var(--text-soft)]">
        Vragen? Mail{" "}
        <a
          href="mailto:info@dicteren.ai"
          className="underline hover:text-[color:var(--navy)]"
        >
          info@dicteren.ai
        </a>
        .
      </p>
    </TrialShell>
  );
}

function TrialShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-xl">
        <Link
          href="/"
          className="mb-6 inline-flex text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
        >
          ← Terug naar de site
        </Link>
        {children}
      </div>
    </main>
  );
}
