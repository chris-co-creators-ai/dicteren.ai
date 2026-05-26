// Dicteren.ai — Verify-email landing
//
// Better Auth stuurt een mail met een link met ?token=... naar deze page.
// Bij aanwezig token: client component roept /api/auth/verify-email aan
// met credentials zodat de session-cookie gezet wordt. Bij 4xx redirect
// de client naar ?error=expired zodat de gebruiker onze eigen
// "Bevestiging mislukt"-page ziet (geen Next.js 404).
//
// Specifieke route, wint van /auth/[path]/page.tsx voor deze URL.

import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";
import { VerifyClient } from "./verify-client";

type SearchParams = Promise<{
  token?: string;
  callbackURL?: string;
  error?: string;
}>;

const ALLOWED_CALLBACKS = new Set([
  "/account",
  "/account/licenses",
  "/account/billing",
  "/trial/start",
  "/prijzen",
  "/download",
]);

function safeCallback(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/account";
  const path = raw.split("?")[0];
  return ALLOWED_CALLBACKS.has(path) ? raw : "/account";
}

export default async function VerifyEmailLandingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token, callbackURL, error } = await searchParams;

  if (token && !error) {
    return <VerifyClient token={token} callbackURL={safeCallback(callbackURL)} />;
  }

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 size-[40rem] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, var(--aqua-200), transparent 70%)" }}
      />
      <div
        className="relative w-full max-w-md rounded-3xl border bg-white px-8 py-10 text-center"
        style={{ borderColor: "var(--border-soft)", boxShadow: "var(--shadow-lg)" }}
      >
        <LogoIcon size={56} className="mx-auto" />
        {error ? (
          <>
            <div className="mx-auto mt-6 grid size-12 place-items-center rounded-full"
              style={{ background: "var(--orange-50)" }}>
              <AlertCircle className="size-6" strokeWidth={2.2} style={{ color: "var(--orange-600)" }} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight" style={{ color: "var(--navy)" }}>
              Bevestiging mislukt
            </h1>
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              De link is verlopen of al gebruikt. Log in en vraag op je accountpagina een nieuwe verificatie aan.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mt-6 grid size-12 place-items-center rounded-full"
              style={{ background: "var(--aqua-200)" }}>
              <CheckCircle2 className="size-6" strokeWidth={2.2} style={{ color: "var(--navy)" }} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight" style={{ color: "var(--navy)" }}>
              Check je inbox
            </h1>
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              We sturen je een mail met een bevestigingslink. Klik op de knop in die mail om je e-mailadres te bevestigen.
            </p>
          </>
        )}
        <Link
          href="/auth/sign-in"
          className="btn btn-secondary mt-7 inline-flex"
        >
          Naar inloggen
        </Link>
      </div>
    </main>
  );
}
