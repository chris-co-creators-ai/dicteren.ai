"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Apple, Download, Globe, Shield } from "lucide-react";
import { AppMiniBar } from "@/components/app/app-mini-bar";

const DEMO_TEXT =
  "Hoi Sanne, het werk aan jullie keuken loopt voor op schema. Ik kom dinsdag rond 10 uur even langs om de aansluiting te checken. Past het je dan? Anders hoor ik graag.";

export function HeroSection() {
  const [demoText, setDemoText] = useState("");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let i = 0;
    let typing = true;
    const id = window.setInterval(() => {
      if (typing) {
        if (i <= DEMO_TEXT.length) {
          setDemoText(DEMO_TEXT.slice(0, i));
          i += 2;
        } else {
          typing = false;
          window.setTimeout(() => {
            setDemoText("");
            i = 0;
            typing = true;
            setCycle((c) => c + 1);
          }, 1800);
        }
      }
    }, 35);
    return () => window.clearInterval(id);
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
            14 dagen gratis · Mac &amp; Windows
          </span>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Wat een werk,{" "}
            <span className="relative inline-block">
              dat typen.
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
            </span>{" "}
            Elke dag weer.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:mt-6 sm:text-lg">
            Praat je tekst in plaats van te tikken. Dicteren.ai typt voor
            je, in Word, je mail en WhatsApp Web. Lokaal, op jouw computer.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:flex-wrap">
            <Link
              href="/auth/sign-up?next=/trial/start"
              className="btn btn-primary btn-lg"
            >
              <Download className="size-4" />
              Probeer 14 dagen gratis
            </Link>
            <Link href="#hoe-het-werkt" className="btn btn-secondary btn-lg">
              Bekijk hoe het werkt
            </Link>
          </div>
          <p className="mt-3 text-xs text-[color:var(--text-soft)] sm:text-sm">
            Geen creditcard nodig. Stopt vanzelf.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[color:var(--text-muted)] sm:mt-7 sm:text-sm">
            {[
              { icon: Shield, label: "Spraak blijft lokaal" },
              { icon: Globe, label: "Nederlands taalmodel" },
              { icon: Apple, label: "Mac en Windows" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color: "var(--navy-500)" }} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: real component scene */}
        <div className="relative hidden h-[30rem] items-center justify-center lg:flex">
          {/* Mock app-window with text appearing */}
          <div
            className="relative w-[28rem] overflow-hidden rounded-2xl bg-white"
            style={{
              border: "1px solid var(--border-soft)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Window chrome */}
            <div
              className="flex items-center gap-2 border-b px-4 py-3"
              style={{
                borderColor: "var(--border-soft)",
                background: "var(--bg)",
              }}
            >
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span
                className="ml-3 text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Nieuw bericht — Mail
              </span>
            </div>

            {/* Mail-style fields */}
            <div className="px-5 pt-4 pb-2">
              <div
                className="flex items-baseline gap-3 border-b py-2 text-sm"
                style={{ borderColor: "var(--border-soft)" }}
              >
                <span
                  className="w-20 text-xs font-semibold"
                  style={{ color: "var(--text-soft)" }}
                >
                  Aan:
                </span>
                <span style={{ color: "var(--navy)" }}>sanne@vandenberg.nl</span>
              </div>
              <div
                className="flex items-baseline gap-3 border-b py-2 text-sm"
                style={{ borderColor: "var(--border-soft)" }}
              >
                <span
                  className="w-20 text-xs font-semibold"
                  style={{ color: "var(--text-soft)" }}
                >
                  Onderwerp:
                </span>
                <span style={{ color: "var(--navy)" }}>Update keuken</span>
              </div>
            </div>

            {/* Text area where dictated text appears */}
            <div className="px-5 pt-3 pb-16">
              <p
                key={cycle}
                className="min-h-[10rem] text-sm leading-relaxed"
                style={{ color: "var(--navy)" }}
              >
                {demoText}
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 align-[-2px]"
                  style={{
                    background: "var(--orange)",
                    animation: "dicteren-caret 1s steps(2) infinite",
                  }}
                />
              </p>
            </div>
          </div>

          {/* The REAL AppMiniBar — floating overlay, just like in the actual app */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <AppMiniBar visible={true} state="recording" timerKey={cycle} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dicteren-caret { 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}
