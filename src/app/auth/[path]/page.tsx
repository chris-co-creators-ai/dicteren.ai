import Link from "next/link";
import { Apple, Check, Lock, Shield } from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";
import { VoiceWave } from "@/components/shared/voice-wave";
import { AuthForms } from "@/components/auth/auth-forms";

const KNOWN_PATHS = new Set([
  "sign-in",
  "sign-up",
  "forgot-password",
  "reset-password",
  "verify-email",
  "callback",
]);

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from(KNOWN_PATHS).map((path) => ({ path }));
}

type Copy = {
  title: string;
  subtitle: string;
  sidebar: {
    heading: string;
    intro: string;
    bullets: { icon: typeof Shield; label: string }[];
  };
};

const COPY: Record<string, Copy> = {
  "sign-up": {
    title: "Begin met dicteren",
    subtitle:
      "Maak je account aan en probeer Dicteren.ai veertien dagen gratis. Geen creditcard nodig.",
    sidebar: {
      heading: "Spreek je\ngedachten uit.",
      intro:
        "Druk een sneltoets, vertel wat je wil, en je tekst staat er. In elke app. Op je eigen computer.",
      bullets: [
        { icon: Shield, label: "Spraak en tekst blijven lokaal" },
        { icon: Check, label: "Veertien dagen gratis proberen" },
        { icon: Apple, label: "Mac en Windows" },
        { icon: Lock, label: "Opzeggen wanneer je wil" },
      ],
    },
  },
  "sign-in": {
    title: "Welkom terug",
    subtitle: "Log in bij je Dicteren.ai-account.",
    sidebar: {
      heading: "Alles op één plek.",
      intro:
        "Je licentie, downloads en facturen vind je in je account. Doorgaan waar je gebleven was.",
      bullets: [
        { icon: Shield, label: "Je licentie en apparaten" },
        { icon: Check, label: "Eerdere facturen terugzien" },
        { icon: Apple, label: "Download voor Mac en Windows" },
        { icon: Lock, label: "Abonnement beheren" },
      ],
    },
  },
  "forgot-password": {
    title: "Wachtwoord vergeten?",
    subtitle: "Geef je e-mail op en we sturen je een herstel-link.",
    sidebar: {
      heading: "Geen zorgen,\nwe helpen je terug.",
      intro:
        "Een nieuwe link in je mailbox binnen een minuut. Je licentie en instellingen blijven bewaard.",
      bullets: [
        { icon: Shield, label: "Veilig herstel via je e-mail" },
        { icon: Check, label: "Werkt op elk apparaat" },
      ],
    },
  },
  "reset-password": {
    title: "Stel een nieuw wachtwoord in",
    subtitle: "Kies iets dat alleen jij onthoudt.",
    sidebar: {
      heading: "Bijna klaar.",
      intro:
        "Stel je nieuwe wachtwoord in en je kunt direct verder met dicteren.",
      bullets: [
        { icon: Shield, label: "Versleuteld opgeslagen" },
        { icon: Check, label: "Direct daarna ingelogd" },
      ],
    },
  },
  "verify-email": {
    title: "Bevestig je e-mailadres",
    subtitle: "Check je inbox voor de verificatielink.",
    sidebar: {
      heading: "Bijna binnen.",
      intro:
        "We sturen je een mail met een link. Klik erop en je account is actief.",
      bullets: [{ icon: Shield, label: "Eenmalig, daarna ben je klaar" }],
    },
  },
  callback: {
    title: "Eén moment",
    subtitle: "We loggen je in.",
    sidebar: {
      heading: "Bijna binnen.",
      intro: "Een ogenblik geduld.",
      bullets: [],
    },
  },
};

const DEFAULT_COPY: Copy = {
  title: "Dicteren.ai",
  subtitle: "",
  sidebar: {
    heading: "Lokaal dicteren\nvoor Nederlanders.",
    intro: "Spreek je gedachten uit, in elke app, op je eigen computer.",
    bullets: [
      { icon: Shield, label: "Lokaal en privé" },
      { icon: Apple, label: "Mac en Windows" },
    ],
  },
};

const SAFE_REDIRECT_TARGETS = new Set([
  "/account",
  "/account/licenses",
  "/account/billing",
  "/trial/start",
  "/prijzen",
  "/download",
  "/auth/reset-password",
]);

function safeNext(raw: string | string[] | undefined): string {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate) return "/account";
  if (!candidate.startsWith("/")) return "/account";
  const path = candidate.split("?")[0];
  return SAFE_REDIRECT_TARGETS.has(path) ? candidate : "/account";
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { path } = await params;
  const { next } = await searchParams;
  const copy = COPY[path] ?? DEFAULT_COPY;
  const redirectTo = safeNext(next);

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 size-[40rem] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, var(--aqua-200), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -left-28 size-[32rem] rounded-full opacity-35"
        style={{
          background: "radial-gradient(circle, #ffd8be, transparent 70%)",
        }}
      />

      <header className="relative flex items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon size={36} />
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: "var(--navy)" }}
          >
            Dicteren<span style={{ color: "var(--orange)" }}>.ai</span>
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
        >
          ← Terug naar de site
        </Link>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div className="hidden flex-col gap-6 lg:flex">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[0.6875rem] font-bold"
              style={{
                background: "var(--orange-50)",
                color: "var(--orange-600)",
              }}
            >
              <VoiceWave bars={3} />
              Veertien dagen gratis
            </span>

            <h1
              className="whitespace-pre-line text-4xl font-bold leading-[1.05] tracking-tight lg:text-5xl"
              style={{ color: "var(--navy)" }}
            >
              {copy.sidebar.heading}
            </h1>

            <p
              className="max-w-sm text-base leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {copy.sidebar.intro}
            </p>

            <ul className="mt-2 flex flex-col gap-3">
              {copy.sidebar.bullets.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: "var(--text)" }}
                >
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full"
                    style={{ background: "var(--aqua-200)" }}
                  >
                    <Icon
                      className="size-3.5"
                      strokeWidth={2.2}
                      style={{ color: "var(--navy)" }}
                    />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-3xl border bg-white px-6 py-8 sm:px-10 sm:py-10"
            style={{
              borderColor: "var(--border-soft)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LogoIcon size={36} />
              <span
                className="text-base font-bold tracking-tight"
                style={{ color: "var(--navy)" }}
              >
                Dicteren<span style={{ color: "var(--orange)" }}>.ai</span>
              </span>
            </div>

            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--navy)" }}
            >
              {copy.title}
            </h2>
            {copy.subtitle && (
              <p
                className="mt-1.5 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {copy.subtitle}
              </p>
            )}

            <div className="mt-6">
              <AuthForms path={path} redirectTo={redirectTo} />
            </div>

            {path === "sign-in" && (
              <>
                <p
                  className="mt-4 text-center text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Link
                    href="/auth/forgot-password"
                    className="font-semibold hover:underline"
                    style={{ color: "var(--navy)" }}
                  >
                    Wachtwoord vergeten?
                  </Link>
                </p>
                <p
                  className="mt-3 text-center text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Nog geen account?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="font-semibold hover:underline"
                    style={{ color: "var(--navy)" }}
                  >
                    Probeer veertien dagen gratis
                  </Link>
                </p>
              </>
            )}
            {path === "sign-up" && (
              <p
                className="mt-6 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Al een account?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold hover:underline"
                  style={{ color: "var(--navy)" }}
                >
                  Inloggen
                </Link>
              </p>
            )}
            {path === "forgot-password" && (
              <p
                className="mt-6 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Weet je je wachtwoord weer?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold hover:underline"
                  style={{ color: "var(--navy)" }}
                >
                  Inloggen
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      <footer
        className="relative px-6 py-5 text-center text-[0.6875rem]"
        style={{ color: "var(--text-soft)" }}
      >
        Met liefde gemaakt in Nederland · Dicteren.ai
      </footer>
    </main>
  );
}
