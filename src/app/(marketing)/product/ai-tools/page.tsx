"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Download, Shield, Sparkles } from "lucide-react";
import { VoiceWave } from "@/components/shared/voice-wave";
import { AiToolChipList } from "@/components/shared/ai-tool-chip";
import { cn } from "@/lib/utils";

type Tool = "ChatGPT" | "Claude" | "Copilot" | "Gemini";

const EXAMPLES: Record<Tool, string> = {
  ChatGPT:
    "Schrijf een marketingplan voor mijn yogastudio. We zitten in Utrecht-Oost, hebben 12 vaste klanten en willen groeien naar 40 binnen 6 maanden zonder kortingsacties.",
  Claude:
    "Analyseer dit huurcontract artikel voor artikel. Let vooral op opzegtermijnen, onderhoudsverdeling en indexering. Mijn tegenpartij is een grote belegger, ik zit als zzp'er aan tafel.",
  Copilot:
    "Schrijf een formule die in kolom F de gemiddelde levertijd berekent per leverancier, maar alleen voor orders na 1 januari, en negeer rijen waar status \"geannuleerd\" is.",
  Gemini:
    "Maak een planning voor onze schoolweek met groep 7. Maandag rekenen met breuken, dinsdag uitje naar het Spoorwegmuseum, donderdag toets begrijpend lezen. Houd rekening met 26 kinderen waarvan 4 met extra ondersteuning.",
};

const WORKFLOW = [
  { n: "01", title: "Open AI-tool", desc: "In de browser of desktop-app." },
  { n: "02", title: "Druk sneltoets", desc: "Standaard ⌥ Space." },
  { n: "03", title: "Spreek prompt uit", desc: "Inclusief context." },
  { n: "04", title: "Bekijk tekst", desc: "Direct in het veld." },
  { n: "05", title: "Verstuur", desc: "Krijg betere output." },
];

const CONTEXT_TAGS: { label: string; example: string }[] = [
  { label: "Nuance", example: "\"…maar niet te formeel\"" },
  { label: "Achtergrond", example: "\"we werken al 3 jaar samen\"" },
  { label: "Voorbeelden", example: "\"zoals vorig kwartaal\"" },
  { label: "Randvoorwaarden", example: "\"behalve voor klant X\"" },
];

export default function AiToolsPage() {
  const [tool, setTool] = useState<Tool>("ChatGPT");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 size-[32rem] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, var(--aqua-200), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="chip chip-orange">Product · AI-tools</span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Vertel je AI wat je{" "}
            <span style={{ color: "var(--orange)" }}>écht</span> bedoelt.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
            De meeste prompts blijven op één regel hangen. Spreken voegt
            vanzelf toon, voorbeelden en achtergrond toe. Precies wat AI nodig
            heeft voor een goed antwoord.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/auth/sign-up?next=/trial/start"
              className="btn btn-primary btn-lg"
            >
              <Download className="size-4" />
              Start 14 dagen gratis
            </Link>
            <Link href="/product/privacy" className="btn btn-secondary btn-lg">
              Lees de privacy-uitleg
            </Link>
          </div>
        </div>
      </section>

      {/* Tool switcher + prompt demo */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div
          role="tablist"
          aria-label="Voorbeeldprompt per AI-tool"
          className="mb-7 flex flex-wrap justify-center gap-2"
        >
          {(Object.keys(EXAMPLES) as Tool[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tool === t}
              onClick={() => setTool(t)}
              className={cn(
                "rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
                tool === t
                  ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                  : "border-[color:var(--border-soft)] bg-white text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[color:var(--border-soft)] bg-white"
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
            <span
              className="ml-4 flex-1 truncate rounded-md border border-[color:var(--border-soft)] bg-white px-3 py-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {tool.toLowerCase()}.example.com/new-prompt
            </span>
          </div>

          <div
            className="p-6 sm:p-8"
            style={{ background: "linear-gradient(180deg, white, var(--bg))" }}
          >
            <div className="mb-3 text-sm font-semibold text-[color:var(--text-soft)]">
              Nieuwe prompt naar {tool}
            </div>
            <div
              className="rounded-2xl border-2 bg-white p-5"
              style={{
                borderColor: "var(--orange)",
                boxShadow: "0 0 0 6px rgba(255, 132, 65, 0.10)",
              }}
            >
              <div className="mb-3 flex items-center gap-2.5 text-xs text-[color:var(--text-soft)]">
                <VoiceWave bars={5} />
                <span>Dicteren.ai luistert · {tool}</span>
                <span className="ml-auto font-mono">00:14</span>
              </div>
              <p className="text-base leading-relaxed text-[color:var(--navy)] sm:text-[17px]">
                {EXAMPLES[tool]}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip chip-green">
                <Shield className="size-3" strokeWidth={2.2} />
                Lokaal
              </span>
              <span className="chip">
                <Sparkles
                  className="size-3"
                  strokeWidth={2.2}
                  style={{ color: "var(--orange)" }}
                />
                62 woorden · 14s
              </span>
              <span className="chip chip-navy">
                <Briefcase className="size-3" strokeWidth={2.2} />
                Toon, context en nuance
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-y border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Een prompt in 5 seconden
        </h2>
        <div className="mx-auto mt-10 grid max-w-6xl gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {WORKFLOW.map((s) => (
            <div key={s.n} className="brand-card p-5">
              <div
                className="font-mono text-xs font-bold tracking-[0.08em]"
                style={{ color: "var(--orange)" }}
              >
                {s.n}
              </div>
              <div className="mt-2 text-base font-semibold">{s.title}</div>
              <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why voice works */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="chip">Waarom spreken werkt</span>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Je hersenen geven méér mee als je spreekt.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[color:var(--text-muted)] sm:text-[17px]">
              Typen dwingt je tot kortheid. Spreken niet. Daarom voegen mensen
              vanzelf voorbeelden, achtergrond en uitzonderingen toe. Precies
              de informatie die een AI nodig heeft.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {CONTEXT_TAGS.map((tag) => (
                <div
                  key={tag.label}
                  className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-3.5"
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-[0.05em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tag.label}
                  </div>
                  <div className="mt-1 text-sm italic text-[color:var(--navy)]">
                    {tag.example}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats card */}
          <div className="brand-card p-6">
            <div className="text-xs font-semibold text-[color:var(--text-muted)]">
              Gemiddelde lengte van een prompt
            </div>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <div className="mb-1.5 flex justify-between">
                  <span className="text-sm font-semibold">Getypt</span>
                  <span className="text-sm text-[color:var(--text-muted)]">
                    22 woorden
                  </span>
                </div>
                <div
                  className="h-6 overflow-hidden rounded-lg"
                  style={{ background: "var(--bg-deep)" }}
                >
                  <div
                    className="h-full rounded-lg"
                    style={{ width: "22%", background: "var(--navy-300)" }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between">
                  <span className="text-sm font-semibold">Gesproken</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--orange)" }}
                  >
                    118 woorden · 5,4×
                  </span>
                </div>
                <div
                  className="h-6 overflow-hidden rounded-lg"
                  style={{ background: "var(--bg-deep)" }}
                >
                  <div
                    className="h-full rounded-lg"
                    style={{
                      width: "95%",
                      background:
                        "linear-gradient(90deg, var(--aqua), var(--orange))",
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[0.6875rem] italic text-[color:var(--text-soft)]">
              Indicatief, op basis van interne tests met beta-gebruikers.
            </p>
          </div>
        </div>
      </section>

      {/* Compatibility */}
      <section
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14"
        style={{ background: "var(--bg-deep)" }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Plakt direct in elke AI-tool
          </h3>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            En in elke andere app waarin je een tekstveld kunt typen.
          </p>
          <AiToolChipList
            tools={[
              "chatgpt",
              "claude",
              "copilot",
              "gemini",
              "perplexity",
              "mistral",
            ]}
            className="mt-6 justify-center"
          />
          <p className="mt-5 text-[0.6875rem] italic text-[color:var(--text-soft)]">
            Compatibiliteit · geen officieel partnerschap of certificering.
          </p>
        </div>
      </section>
    </>
  );
}
