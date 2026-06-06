import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  KeyRound,
} from "lucide-react";
import {
  getUserActiveSubscription,
  getUserTrial,
  listUserPaidLicenses,
} from "@/lib/services";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn account · Dicteren.ai" };

export default async function AccountHomePage() {
  const session = (await getSession())!;

  const [trial, paid, activeSub] = await Promise.all([
    getUserTrial(session.user.id),
    listUserPaidLicenses(session.user.id),
    getUserActiveSubscription(session.user.id),
  ]);

  const activationCount = paid.reduce((sum, l) => sum + l.activeActivations, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Hallo {session.user.name?.split(" ")[0] ?? ""}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        {session.user.email}
      </p>

      {/* Trial-blok alleen relevant zolang je nog geen betaalde/lifetime
          licentie hebt. Een verlopen trial naast een actieve licentie is ruis. */}
      {trial && !paid.length && (
        <div className="mt-8 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Gratis proefperiode
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {trial.isActive ? `${trial.daysLeft} dagen` : "Verlopen"}
                </span>
                {trial.isActive && (
                  <span className="text-sm text-[color:var(--text-muted)]">
                    over
                  </span>
                )}
              </div>
              {trial.expiresAt && (
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {trial.isActive ? "Loopt tot " : "Liep tot "}
                  {trial.expiresAt.toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
              style={{
                background: trial.isActive
                  ? "color-mix(in srgb, var(--green) 12%, white)"
                  : "color-mix(in srgb, var(--orange) 12%, white)",
                color: trial.isActive ? "var(--green)" : "var(--orange-600)",
              }}
            >
              {trial.isActive ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <Clock className="size-3" />
              )}
              {trial.isActive ? "Actief" : "Verlopen"}
            </span>
          </div>

          {trial.isActive && (
            <div className="mt-4 rounded-lg bg-[color:var(--surface-2)] p-3">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Trial-code
              </div>
              <code
                className="mt-1 inline-block font-mono text-sm font-bold"
                style={{ color: "var(--navy)" }}
              >
                {trial.code}
              </code>
            </div>
          )}

          {!trial.isActive && (
            <div
              className="mt-4 rounded-lg px-4 py-3 text-xs"
              style={{
                background: "color-mix(in srgb, var(--orange) 6%, white)",
                color: "var(--text)",
              }}
            >
              Je proefperiode is voorbij. Kies een licentie om door te gaan met
              Dicteren.ai.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {trial.isActive && !paid.length && (
              <Link href="/download" className="btn btn-secondary">
                <Download className="size-3.5" />
                Download de app
              </Link>
            )}
            {!activeSub && (
              <Link href="/prijzen" className="btn btn-primary">
                <CreditCard className="size-3.5" />
                Bekijk de prijzen
              </Link>
            )}
          </div>
        </div>
      )}

      {!trial && !paid.length && (
        <div className="mt-8 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
          <h2 className="text-lg font-semibold">Nog niet gestart?</h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Probeer Dicteren.ai 14 dagen gratis. Geen creditcard nodig.
          </p>
          <Link href="/trial/start" className="btn btn-primary mt-4">
            <Clock className="size-3.5" />
            Start 14 dagen gratis
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/licenses"
          className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 hover:border-[color:var(--navy)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Licenties
              </div>
              <div className="mt-1 text-xl font-bold">
                {paid.length + (trial ? 1 : 0)}
              </div>
              <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                {activationCount} actief op apparaten
              </div>
            </div>
            <KeyRound
              className="size-6 text-[color:var(--text-muted)]"
              strokeWidth={2}
            />
          </div>
        </Link>

        <Link
          href="/account/billing"
          className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 hover:border-[color:var(--navy)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Facturering
              </div>
              <div className="mt-1 text-xl font-bold">
                {activeSub ? "Actief" : "Geen abonnement"}
              </div>
              <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                {activeSub?.nextBillingAt
                  ? `Volgende: ${activeSub.nextBillingAt.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`
                  : "Beheer abonnement"}
              </div>
            </div>
            <CreditCard
              className="size-6 text-[color:var(--text-muted)]"
              strokeWidth={2}
            />
          </div>
        </Link>
      </div>

      {/* Upgrade naar zakelijk CTA — alleen voor consumer-klanten (geen org) */}
      {paid.length > 0 && (
        <div
          className="mt-8 rounded-2xl border p-6"
          style={{
            background: "var(--aqua-50)",
            borderColor: "var(--aqua-200)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[color:var(--navy)]">
                Werk je in een team?
              </h2>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Upgrade naar een zakelijk abonnement met seats voor je
                collega&apos;s. Je krijgt staffelkorting vanaf 5 seats en kunt
                vanaf één dashboard alles beheren.
              </p>
            </div>
            <Link
              href="/zakelijk/start?plan=org-yearly&from=consumer_upgrade"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "#FF8441" }}
            >
              Upgrade naar zakelijk
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
