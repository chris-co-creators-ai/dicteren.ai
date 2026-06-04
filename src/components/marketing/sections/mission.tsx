"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";

// Onze missie — bewuste register-wissel: deze sectie spreekt de taal van het
// sociale domein (digitale inclusie, meedoen, zelfredzaamheid). Zie TOV.

const MISSION_DEMO = "Lieve Anna, wat fijn dat je er gisteren was. Ik heb genoten.";

export function MissionSection() {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i > MISSION_DEMO.length + 24) i = 0; // korte pauze, dan opnieuw
      setTyped(MISSION_DEMO.slice(0, i));
    }, 70);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className="px-6 py-20 lg:px-14 lg:py-24"
      style={{ background: "var(--bg-deep)" }}
      id="onze-missie"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Links: de missie */}
        <div>
          <span className="chip chip-orange">Onze missie</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
            Iedereen verdient een stem.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] lg:text-lg">
            Met het team van Dicteren.ai zetten we ons in voor een samenleving
            waarin iedereen mee kan doen. Ook digitaal. Daar maken we onder
            werktijd ruimte voor, want maatschappelijke impact hoort wat ons
            betreft gewoon bij ondernemen.
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)]">
            Ieder van ons kent iemand voor wie een computer gebruiken niet
            vanzelfsprekend is, door een lichamelijke beperking. Daarom komen
            we graag in contact met organisaties die zich voor deze doelgroep
            inzetten. Samen kijken we, geheel vrijblijvend, waar spraak
            drempels wegneemt en zelfredzaamheid vergroot. Dicteren.ai stellen
            we daarvoor kosteloos beschikbaar.
          </p>
          <p className="mt-4 text-base font-semibold text-[color:var(--navy)]">
            {`Ben jij zo'n organisatie, of ken je er een?`}
          </p>
          <div className="mt-5">
            <Link href="/word-partner" className="btn btn-primary">
              Meld een organisatie aan
              <ArrowRight className="size-4" strokeWidth={2.2} />
            </Link>
          </div>
          <p className="mt-4 text-sm text-[color:var(--text-soft)]">
            Namens het hele team: alvast hartelijk dank.
          </p>
        </div>

        {/* Rechts: mascotte die tekst het scherm in laat stromen */}
        <div className="relative hidden lg:block">
          <div
            className="relative overflow-hidden rounded-2xl bg-white"
            style={{
              border: "1px solid var(--border-soft)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="flex items-center gap-2 border-b px-4 py-3"
              style={{ borderColor: "var(--border-soft)", background: "var(--bg)" }}
            >
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Bericht aan Anna
              </span>
            </div>
            <div className="min-h-[13rem] px-5 py-4">
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--navy)" }}>
                {typed}
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 align-[-2px]"
                  style={{
                    background: "var(--orange)",
                    animation: "dicteren-mission-caret 1s steps(2) infinite",
                  }}
                />
              </p>
            </div>
          </div>

          {/* Curve van de mascotte naar het scherm */}
          <svg
            aria-hidden
            viewBox="0 0 220 120"
            className="absolute -bottom-14 -left-10 w-[220px]"
          >
            <path
              d="M30 100 C 70 95, 120 70, 180 18"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2.5"
              strokeDasharray="2 7"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute -bottom-20 -left-16">
            <LogoIcon size={92} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dicteren-mission-caret { 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}
