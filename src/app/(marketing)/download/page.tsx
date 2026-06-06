"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Download as DownloadIcon,
  Key,
  Lock,
  Mic,
  Monitor,
  RefreshCw,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Os = "mac" | "win";

/**
 * URL naar de Apple Silicon .dmg op ons eigen R2 (zelfde bucket als het
 * model-CDN, releases/-prefix). Bij elke release-bump dit pad updaten,
 * samen met public/releases/latest.json (updater-manifest).
 * Intel-Mac support volgt zodra ort-sys een x86_64 prebuilt levert
 * (of we naar ort-tract switchen).
 */
const MAC_DMG_URL =
  "https://models.dicteren.ai/releases/Dicteren.ai_0.8.5_aarch64.dmg";

// Gesigneerd + genotariseerd per 0.8.5 — knop open.
const MAC_LOCKED = false;

const WIN_SETUP_URL =
  "https://models.dicteren.ai/releases/Dicteren.ai_0.8.5_x64-setup.exe";

// Windows-build is nog ONGESIGNEERD (Azure Trusted Signing volgt). Op true =
// knop dicht; op false = knop open met SmartScreen-uitleg eronder.
const WIN_LOCKED = true;

const OS_INFO: Record<
  Os,
  { label: string; sub: string; icon: typeof Apple; available: boolean }
> = {
  mac: {
    label: "macOS",
    sub: "Apple Silicon · M1 t/m M4",
    icon: Apple,
    available: true,
  },
  win: {
    label: "Windows",
    sub: "Binnenkort beschikbaar",
    icon: Monitor,
    available: false,
  },
};

const AFTER_DOWNLOAD = [
  {
    icon: DownloadIcon,
    title: "Installeer de app",
    desc: "Sleep Dicteren.ai naar Programma's (Mac) of voer de installer uit (Windows).",
  },
  {
    icon: Settings,
    title: "Geef twee toestemmingen",
    desc: "Microfoon en toegankelijkheid — zonder die kan de app je stem niet horen of tekst in je apps zetten.",
  },
  {
    icon: Key,
    title: "Activeer in de app",
    desc: "Plak je licentiecode of start je 14-dagen-trial. Daarna ben je klaar om te dicteren.",
  },
];

const TROUBLESHOOTING = [
  {
    icon: Mic,
    title: "Microfoon geeft geen toegang",
    desc: "Open Systeeminstellingen → Privacy → Microfoon en zet Dicteren.ai aan.",
    href: "/kennisbank/opstarten/microfoon-toestemming",
  },
  {
    icon: Settings,
    title: "Toegankelijkheid op Mac",
    desc: "Geef toegang via Systeeminstellingen → Privacy & beveiliging.",
    href: "/kennisbank/opstarten/toegankelijkheid",
  },
  {
    icon: RefreshCw,
    title: "Model opnieuw installeren",
    desc: "Verwijder de modelmap en herstart de app om opnieuw te downloaden.",
    href: "/kennisbank/niet-werkt",
  },
];

export default function DownloadPage() {
  const [os, setOs] = useState<Os>("mac");

  return (
    <>
      {/* Hero */}
      <section className="px-4 pt-12 pb-12 text-center sm:px-6 sm:pt-16 sm:pb-16 lg:px-14 lg:pt-20">
        <span className="chip">14 dagen gratis</span>
        <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Download Dicteren.ai
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Werkt op Mac en Windows. Het Nederlandse taalmodel installeert vanzelf
          de eerste keer. Daarna ben je offline klaar.
        </p>

        {/* OS toggle */}
        <div className="mt-7 inline-flex flex-col gap-1 rounded-2xl border border-[color:var(--border-soft)] bg-white p-1 sm:flex-row sm:rounded-full">
          {(Object.entries(OS_INFO) as [Os, (typeof OS_INFO)[Os]][]).map(
            ([key, info]) => {
              const Icon = info.icon;
              const active = os === key;
              return (
                <button
                  key={key}
                  onClick={() => setOs(key)}
                  className={cn(
                    "inline-flex items-center gap-2.5 rounded-xl px-5 py-3 transition-colors sm:rounded-full",
                    active
                      ? "bg-[color:var(--navy)] text-white"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">
                      {info.label}
                    </span>
                    <span className="block text-[0.6875rem] opacity-70">
                      {info.sub}
                    </span>
                  </span>
                </button>
              );
            },
          )}
        </div>

        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          {os === "mac" ? (
            MAC_DMG_URL && !MAC_LOCKED ? (
              <a href={MAC_DMG_URL} className="btn btn-primary btn-lg">
                <DownloadIcon className="size-4" />
                Download voor macOS
              </a>
            ) : (
              <button
                className="btn btn-primary btn-lg cursor-not-allowed opacity-60"
                disabled
                aria-disabled
              >
                <Lock className="size-4" />
                macOS · binnenkort beschikbaar
              </button>
            )
          ) : WIN_SETUP_URL && !WIN_LOCKED ? (
            <a href={WIN_SETUP_URL} className="btn btn-primary btn-lg">
              <DownloadIcon className="size-4" />
              Download voor Windows
            </a>
          ) : (
            <button
              className="btn btn-primary btn-lg cursor-not-allowed opacity-60"
              disabled
              aria-disabled
            >
              <Lock className="size-4" />
              Windows · binnenkort beschikbaar
            </button>
          )}
          <Link
            href="/auth/sign-up?next=/trial/start"
            className="btn btn-secondary btn-lg"
          >
            Start trial-account
          </Link>
        </div>
      </section>

      {/* After download */}
      <section className="border-y border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Wat gebeurt er na de download
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[color:var(--text-muted)] sm:text-base">
            Drie stappen, ongeveer drie minuten. De app leidt je er stap voor
            stap doorheen.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {AFTER_DOWNLOAD.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="brand-card p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-9 place-items-center rounded-xl"
                      style={{ background: "var(--aqua-50)" }}
                    >
                      <Icon
                        className="size-4.5"
                        strokeWidth={1.8}
                        style={{ color: "var(--navy)" }}
                      />
                    </span>
                    <span
                      className="font-mono text-xs font-bold tracking-[0.04em]"
                      style={{ color: "var(--orange)" }}
                    >
                      0{i + 1}
                    </span>
                  </div>
                  <div className="mt-4 text-[15px] font-semibold">
                    {s.title}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-[color:var(--text-muted)]">
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Iets werkt niet?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TROUBLESHOOTING.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="brand-card block p-5 transition-transform hover:-translate-y-0.5"
                >
                  <Icon
                    className="size-5"
                    strokeWidth={1.8}
                    style={{ color: "var(--orange)" }}
                  />
                  <div className="mt-2.5 text-[15px] font-semibold">
                    {card.title}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {card.desc}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--navy-500)]">
                    Lees uitleg
                    <ArrowRight className="size-3" strokeWidth={2.4} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
