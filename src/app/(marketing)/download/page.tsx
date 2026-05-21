"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Check,
  Download as DownloadIcon,
  Key,
  Mic,
  Monitor,
  RefreshCw,
  Settings,
} from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type Os = "mac" | "win";
type Step = 1 | 2 | 3 | 4;

const OS_INFO: Record<Os, { label: string; sub: string; icon: typeof Apple }> = {
  mac: { label: "macOS", sub: "Apple Silicon & Intel", icon: Apple },
  win: { label: "Windows", sub: "10 en hoger", icon: Monitor },
};

const STEPS: { n: Step; title: string; desc: string }[] = [
  {
    n: 1,
    title: "Download de app",
    desc: "Klik op de knop bovenaan en sla het bestand op.",
  },
  {
    n: 2,
    title: "Installeer en geef toegang",
    desc: "We hebben je microfoon en toegankelijkheid nodig. Anders kunnen we geen tekst in je apps zetten.",
  },
  {
    n: 3,
    title: "Het taalmodel komt erbij",
    desc: "Dicteren.ai V3 installeert vanzelf, ongeveer 450 MB. Eenmalig.",
  },
  {
    n: 4,
    title: "Activeer met je beta-code",
    desc: "Plak je code, klik op Activeren. Klaar om te dicteren.",
  },
];

const TROUBLESHOOTING = [
  {
    icon: Mic,
    title: "Microfoon geeft geen toegang",
    desc: "Open Systeeminstellingen → Privacy → Microfoon en zet Dicteren.ai aan.",
    href: "/help/microfoon-toegang",
  },
  {
    icon: Settings,
    title: "Toegankelijkheid op Mac",
    desc: "Geef toegang via Systeeminstellingen → Privacy & beveiliging.",
    href: "/help/toegankelijkheid-toegang-mac",
  },
  {
    icon: RefreshCw,
    title: "Model opnieuw installeren",
    desc: "Verwijder de map en herstart de app om opnieuw te downloaden.",
    href: "/help/model-downloaden",
  },
];

export default function DownloadPage() {
  const [os, setOs] = useState<Os>("mac");
  const [step, setStep] = useState<Step>(2);
  const [licenseCode, setLicenseCode] = useState("DIC-BETA-2026-K7MJ-Q9RA");

  return (
    <>
      {/* Hero */}
      <section className="px-4 pt-12 pb-8 text-center sm:px-6 sm:pt-16 lg:px-14 lg:pt-20">
        <span className="chip">Beta · gratis</span>
        <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Download Dicteren.ai
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Werkt op Mac en Windows. Het taalmodel komt vanzelf mee. Daarna ben
          je klaar om te dicteren.
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
          <button className="btn btn-primary btn-lg">
            <DownloadIcon className="size-4" />
            Download voor {OS_INFO[os].label} (84 MB)
          </button>
          <Link href="/help" className="btn btn-secondary btn-lg">
            Bekijk installatie-uitleg
          </Link>
        </div>
        <p className="mt-3 text-xs text-[color:var(--text-soft)]">
          Versie 0.7.2-beta · 21 mei 2026
        </p>
      </section>

      {/* Steps + preview */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left: stepper + license input */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Zo zet je het op
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)] sm:text-base">
              In vier stappen ben je klaar. De duur hangt af van je internet.
            </p>

            <div className="mt-7 flex flex-col gap-1">
              {STEPS.map((s) => {
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <button
                    key={s.n}
                    onClick={() => setStep(s.n)}
                    className={cn(
                      "flex w-full gap-4 rounded-2xl border p-4 text-left transition-colors",
                      active
                        ? "border-[color:var(--orange)] bg-[color:var(--orange-50)]"
                        : "border-transparent hover:bg-[color:var(--bg-deep)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold",
                        done
                          ? "bg-[color:var(--green-50)] text-[color:var(--green)]"
                          : active
                            ? "bg-[color:var(--orange)] text-white"
                            : "bg-[color:var(--bg-deep)] text-[color:var(--text-muted)]",
                      )}
                    >
                      {done ? (
                        <Check className="size-4" strokeWidth={2.6} />
                      ) : (
                        s.n
                      )}
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold">{s.title}</div>
                      <div className="mt-0.5 text-sm text-[color:var(--text-muted)]">
                        {s.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* License input */}
            <div className="brand-card mt-6 p-5">
              <h4 className="text-sm font-bold text-[color:var(--navy)]">
                Heb je al een licentiecode?
              </h4>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Vul hem hier in om in de app klaar te zetten.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={licenseCode}
                  onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-[color:var(--border-soft)] px-3.5 py-3 font-mono text-sm tracking-wider text-[color:var(--navy)] outline-none focus:border-[color:var(--orange)]"
                  aria-label="Beta licentiecode"
                />
                <button className="btn btn-primary">Activeer</button>
              </div>
            </div>
          </div>

          {/* Right: preview window */}
          <div className="lg:sticky lg:top-24">
            <SetupWindow step={step} licenseCode={licenseCode} onLicenseChange={setLicenseCode} />
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
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

function SetupWindow({
  step,
  licenseCode,
  onLicenseChange,
}: {
  step: Step;
  licenseCode: string;
  onLicenseChange: (v: string) => void;
}) {
  const sidebarItems = [
    "Welkom",
    "Toestemmingen",
    "Model installeren",
    "Licentie activeren",
  ];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 border-b border-[color:var(--border-soft)] px-4 py-3"
        style={{ background: "var(--bg)" }}
      >
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs font-medium text-[color:var(--text-muted)]">
          Dicteren.ai · Setup
        </span>
      </div>

      <div className="grid grid-cols-[10rem_1fr] sm:grid-cols-[11rem_1fr]">
        {/* Sidebar */}
        <aside
          className="border-r border-[color:var(--border-soft)] p-4"
          style={{ background: "var(--bg)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="text-xs font-bold sm:text-sm">Dicteren.ai</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {sidebarItems.map((label, i) => {
              const idx = (i + 1) as Step;
              const isActive = idx === step;
              const isDone = idx < step;
              return (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs",
                    isActive
                      ? "bg-white font-bold text-[color:var(--navy)]"
                      : "font-medium text-[color:var(--text-muted)]",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{
                      background: isDone
                        ? "var(--green)"
                        : isActive
                          ? "var(--orange)"
                          : "var(--border-strong)",
                    }}
                  />
                  {label}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-h-[20rem] p-6 sm:p-7">
          {step === 1 && <StepWelcome />}
          {step === 2 && <StepPermissions />}
          {step === 3 && <StepInstall />}
          {step === 4 && (
            <StepActivate code={licenseCode} onChange={onLicenseChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="flex h-full flex-col justify-center">
      <h3 className="text-xl font-bold sm:text-2xl">Welkom 👋</h3>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        We helpen je in 3 minuten op weg. Begin met de toestemmingen.
      </p>
      <button className="btn btn-primary mt-5 self-start">Beginnen</button>
    </div>
  );
}

function StepPermissions() {
  const permissions = [
    {
      icon: Mic,
      title: "Microfoontoegang",
      desc: "Nodig om je stem te kunnen omzetten naar tekst.",
      state: "on" as const,
    },
    {
      icon: Settings,
      title: "Toegankelijkheidstoegang",
      desc: "Nodig om gedicteerde tekst in je apps te typen.",
      state: "wait" as const,
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-bold sm:text-xl">Toestemmingen nodig</h3>
      <p className="mt-1.5 text-sm text-[color:var(--text-muted)]">
        Twee toestemmingen om Dicteren.ai goed te laten werken.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        {permissions.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] p-3.5"
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg"
                style={{ background: "var(--aqua-50)" }}
              >
                <Icon
                  className="size-4"
                  strokeWidth={1.8}
                  style={{ color: "var(--navy)" }}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {p.desc}
                </div>
              </div>
              {p.state === "on" ? (
                <span className="chip chip-green shrink-0 px-2 py-0.5 text-[0.625rem]">
                  <Check className="size-2.5" strokeWidth={2.6} />
                  Gegeven
                </span>
              ) : (
                <span className="chip chip-orange shrink-0 px-2 py-0.5 text-[0.625rem]">
                  Wachten…
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepInstall() {
  const lines = [
    { mark: "✓", text: "Model downloaden…", color: "var(--text-soft)" },
    { mark: "✓", text: "Download controleren…", color: "var(--text-soft)" },
    { mark: "·", text: "Model uitpakken…", color: "var(--orange)" },
    { mark: "○", text: "Model klaar. We gaan verder…", color: "var(--text-soft)", muted: true },
  ];

  return (
    <div>
      <h3 className="text-lg font-bold sm:text-xl">
        Dicteren.ai V3 wordt geïnstalleerd
      </h3>
      <p className="mt-1.5 text-sm text-[color:var(--text-muted)]">
        We installeren automatisch het model. Daarna ga je direct verder.
      </p>
      <div
        className="mt-5 rounded-xl p-4"
        style={{ background: "var(--bg)" }}
      >
        <div className="mb-2 flex justify-between font-mono text-xs text-[color:var(--text-muted)]">
          <span>Model uitpakken…</span>
          <span>74%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-[color:var(--border-soft)] bg-white">
          <div
            className="h-full"
            style={{
              width: "74%",
              background:
                "linear-gradient(90deg, var(--aqua), var(--orange))",
            }}
          />
        </div>
        <ul className="mt-3.5 flex flex-col gap-1 font-mono text-[0.6875rem]">
          {lines.map((l, i) => (
            <li
              key={i}
              style={{ color: l.color, opacity: l.muted ? 0.5 : 1 }}
            >
              <span className="mr-1.5">{l.mark}</span>
              {l.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepActivate({
  code,
  onChange,
}: {
  code: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold sm:text-xl">Activeer Dicteren.ai</h3>
      <p className="mt-1.5 text-sm text-[color:var(--text-muted)]">
        Voer je licentiecode in om Dicteren.ai te ontgrendelen.
      </p>
      <label className="mt-5 block text-xs font-semibold text-[color:var(--text-muted)]">
        Licentiecode
      </label>
      <input
        type="text"
        value={code}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-3.5 py-3 font-mono text-sm tracking-wider text-[color:var(--navy)] outline-none focus:border-[color:var(--orange)]"
        aria-label="Licentiecode"
      />
      <input
        type="email"
        placeholder="E-mail (optioneel)"
        className="mt-2 w-full rounded-xl border border-[color:var(--border-soft)] px-3.5 py-3 text-sm outline-none focus:border-[color:var(--orange)]"
        aria-label="E-mail (optioneel)"
      />
      <button className="btn btn-primary mt-4 self-start">
        <Key className="size-3.5" strokeWidth={2.2} />
        Activeren
      </button>
    </div>
  );
}
