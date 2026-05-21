import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { RedirectAfterAuth } from "@/lib/auth/RedirectAfterAuth";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

const TITLES: Record<string, { h: string; sub: string }> = {
  "sign-in": {
    h: "Welkom terug",
    sub: "Log in om je licenties, klanten en facturen te beheren.",
  },
  "sign-up": {
    h: "Maak je Dicteren.ai-account",
    sub: "Direct toegang tot je licentie, downloads en facturen.",
  },
  "forgot-password": {
    h: "Wachtwoord vergeten?",
    sub: "We mailen je een herstel-link.",
  },
  "reset-password": {
    h: "Stel een nieuw wachtwoord in",
    sub: "Kies iets dat alleen jij onthoudt.",
  },
  callback: { h: "Eén moment…", sub: "We loggen je in." },
  "email-otp": {
    h: "Controleer je e-mail",
    sub: "Vul de code in die we je hebben gestuurd.",
  },
};

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const t = TITLES[path] ?? { h: "Dicteren.ai", sub: "" };

  return (
    <main
      className="flex min-h-screen flex-col"
      style={{ background: "var(--bg)" }}
    >
      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/branding/logo-horizontal.png"
            alt="Dicteren.ai"
            width={148}
            height={34}
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
        >
          ← Terug naar de site
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="hidden flex-col gap-6 lg:flex">
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "var(--orange-50)",
                color: "var(--orange-600)",
              }}
            >
              Admin · v0.7
            </div>
            <h1
              className="text-4xl font-bold leading-tight tracking-tight"
              style={{ color: "var(--navy)" }}
            >
              Lokaal dicteren.<br />
              Centraal beheer.
            </h1>
            <p
              className="max-w-sm text-base leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Alles wat klanten dicteren blijft op hun apparaat. Wat hier
              binnenkomt: licenties, activaties, betalingen, support.
            </p>

            <ul className="mt-2 flex flex-col gap-3">
              {[
                "Beta-codes uitdelen en bewaken",
                "Mollie-betalingen en facturatie zien zodra ze binnenkomen",
                "Support-tickets gekoppeld aan licenties",
              ].map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2.5 text-sm"
                  style={{ color: "var(--text)" }}
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--orange)" }}
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-3xl border bg-white px-6 py-8 sm:px-10 sm:py-10"
            style={{
              borderColor: "var(--border-soft)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="mb-6 flex flex-col gap-1.5 lg:hidden">
              <Image
                src="/branding/logo-icon.png"
                alt=""
                width={40}
                height={40}
              />
            </div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--navy)" }}
            >
              {t.h}
            </h2>
            {t.sub && (
              <p
                className="mt-1.5 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {t.sub}
              </p>
            )}

            <div className="mt-6">
              <AuthProvider>
                <RedirectAfterAuth to="/admin">
                  <AuthView path={path} />
                </RedirectAfterAuth>
              </AuthProvider>
            </div>
          </div>
        </div>
      </div>

      <footer
        className="px-6 py-5 text-center text-[0.6875rem]"
        style={{ color: "var(--text-soft)" }}
      >
        Dicteren.ai · Gemaakt in Nederland · Auth via Neon
      </footer>
    </main>
  );
}
