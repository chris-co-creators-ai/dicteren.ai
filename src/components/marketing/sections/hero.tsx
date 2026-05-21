"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Apple, Check, Copy, Download, Globe, Lock, Send, Shield, Sparkles } from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";
import { VoiceWave } from "@/components/shared/voice-wave";

const DEMO_PROMPT =
  "Ik wil een mail naar de huurder schrijven over het uitstellen van de inspectie naar dinsdag. Houd de toon vriendelijk maar zakelijk en verwijs naar onze eerdere afspraak van vorige week.";

export function HeroSection() {
  const [demoText, setDemoText] = useState("");

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      if (i <= DEMO_PROMPT.length) {
        setDemoText(DEMO_PROMPT.slice(0, i));
        i += 2;
      } else {
        i = 0;
        setTimeout(() => setDemoText(""), 1200);
      }
    }, 35);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-14 lg:py-20">
      {/* Soft background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-20 size-[35rem] rounded-full opacity-55"
        style={{ background: "radial-gradient(circle, var(--aqua-200), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -left-28 size-[29rem] rounded-full opacity-35"
        style={{ background: "radial-gradient(circle, #ffd8be, transparent 70%)" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        {/* Left: copy + CTAs */}
        <div>
          <span className="chip mb-5 sm:mb-6">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full"
              style={{ background: "var(--green)" }}
            />
            Gratis beta · Mac &amp; Windows
          </span>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Betere AI-resultaten beginnen met{" "}
            <span className="relative inline-block">
              meer context
              <svg
                aria-hidden
                viewBox="0 0 360 18"
                className="absolute -bottom-1.5 left-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 12 Q 60 2, 120 10 T 240 8 T 358 12"
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:mt-6 sm:text-lg">
            Druk een sneltoets, spreek je gedachte uit en je tekst staat er.
            In elke app. Op je eigen computer. Klaar voor ChatGPT, Claude,
            Copilot of Gemini.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:flex-wrap">
            <Link href="/download" className="btn btn-primary btn-lg">
              <Download className="size-4" />
              Download gratis beta
            </Link>
            <Link href="/product/ai-tools" className="btn btn-secondary btn-lg">
              Bekijk hoe het werkt
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[color:var(--text-muted)] sm:mt-7 sm:text-sm">
            {[
              { icon: Shield, label: "Spraak blijft lokaal" },
              { icon: Globe, label: "Nederlands taalmodel" },
              { icon: Apple, label: "Mac en Windows" },
              { icon: Lock, label: "Eenmalige koop" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color: "var(--navy-500)" }} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: composed scene — desktop only */}
        <div className="relative hidden h-[34rem] lg:block">
          {/* User card (top left) */}
          <div
            className="brand-card absolute left-0 top-7 w-[16rem] -rotate-[2.5deg] p-4"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="grid size-9 place-items-center rounded-full text-sm font-bold text-[color:var(--navy)]"
                style={{ background: "var(--aqua-200)" }}
              >
                NM
              </div>
              <div>
                <div className="text-sm font-semibold">Noor M.</div>
                <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                  spreekt nu…
                </div>
              </div>
              <span className="ml-auto">
                <VoiceWave bars={5} />
              </span>
            </div>
            <div className="img-ph mt-3 h-[5.75rem] w-full">laptop · person</div>
          </div>

          {/* Mascot floating */}
          <div className="absolute right-14 top-0 rotate-[8deg]">
            <LogoIcon size={120} />
          </div>

          {/* Center: prompt panel */}
          <div
            className="brand-card absolute left-24 top-32 w-[28.75rem] rounded-3xl p-5"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="brand-kbd">⌥</span>
              <span className="brand-kbd">Space</span>
              <span className="text-xs text-[color:var(--text-muted)]">
                Dicteren actief
              </span>
              <span className="ml-auto">
                <VoiceWave />
              </span>
              <span className="font-mono text-[0.6875rem] text-[color:var(--text-soft)]">
                00:08
              </span>
            </div>
            <p className="min-h-[6.875rem] text-[0.9375rem] leading-relaxed text-[color:var(--navy)]">
              {demoText}
              <span
                className="ml-0.5 inline-block h-[1.125rem] w-0.5 align-[-3px]"
                style={{
                  background: "var(--orange)",
                  animation: "dicteren-blink 1s steps(2) infinite",
                }}
              />
            </p>
            <div
              className="mt-3 flex items-center gap-2 border-t pt-3"
              style={{ borderTopStyle: "dashed", borderColor: "var(--border-soft)" }}
            >
              <span className="chip chip-green">
                <Check className="size-3" strokeWidth={2.5} />
                Lokaal verwerkt
              </span>
              <span className="ml-auto inline-flex gap-1.5">
                <button className="btn btn-secondary btn-sm">
                  <Copy className="size-3" />
                  Kopieer
                </button>
                <button className="btn btn-primary btn-sm">
                  <Send className="size-3" />
                  Verstuur
                </button>
              </span>
            </div>
          </div>

          {/* AI result card (bottom right) */}
          <div
            className="brand-card absolute bottom-0 right-0 w-[18.75rem] rotate-[3deg] p-4"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <span
                className="grid size-5 place-items-center rounded-md text-[0.6875rem] text-white"
                style={{ background: "var(--navy)" }}
              >
                AI
              </span>
              <span className="text-xs font-semibold">Concept klaar</span>
              <span className="chip chip-orange ml-auto px-2 py-0.5 text-[0.625rem]">
                Concept
              </span>
            </div>
            <div className="text-xs leading-relaxed text-[color:var(--text-muted)]">
              <p className="font-semibold text-[color:var(--navy)]">Beste familie de Vries,</p>
              <p className="mt-1.5">
                Met het oog op de eerder gemaakte afspraak van vorige week wil ik graag voorstellen om de inspectie te verzetten naar dinsdag.
              </p>
            </div>
          </div>

          {/* Floating mini chips (left middle) */}
          <div className="absolute -left-2 top-80 flex flex-col gap-2">
            <span className="chip" style={{ boxShadow: "var(--shadow-sm)" }}>
              <Sparkles
                className="size-3"
                strokeWidth={2.2}
                style={{ color: "var(--orange)" }}
              />
              +187 woorden context
            </span>
            <span className="chip chip-navy" style={{ boxShadow: "var(--shadow-sm)" }}>
              toon: zakelijk
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dicteren-blink { 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}
