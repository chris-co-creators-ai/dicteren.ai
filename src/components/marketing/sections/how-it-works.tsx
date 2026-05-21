import { Check, Globe, Shield, Sparkles } from "lucide-react";
import { VoiceWave } from "@/components/shared/voice-wave";

export function HowItWorksSection() {
  const steps: { n: number; keys?: string[]; title: string; desc: string }[] = [
    {
      n: 1,
      keys: ["⌥", "Space"],
      title: "Houd je sneltoets ingedrukt",
      desc: "Werkt in elke app waar je kunt typen.",
    },
    {
      n: 2,
      title: "Spreek je gedachte uit",
      desc: "Lokaal verwerkt op je eigen computer.",
    },
    {
      n: 3,
      title: "Tekst verschijnt waar je staat",
      desc: "Direct in je mail, prompt of document.",
    },
  ];

  return (
    <section className="border-y border-[color:var(--border-soft)] bg-white px-6 py-20 lg:px-14 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: copy + steps */}
        <div>
          <span className="chip">Zo werkt het</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            Sneltoets, spreken, en de tekst verschijnt waar je staat.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[color:var(--text-muted)] lg:text-lg">
            Geen aparte app openen. Je werkt gewoon door waar je bezig bent.
            In je mail, in je AI-tool of in een document.
          </p>

          <ol className="mt-8 flex flex-col gap-5">
            {steps.map((step) => (
              <li key={step.n} className="flex items-start gap-4">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-base font-bold text-[color:var(--navy)]"
                  style={{
                    background: "var(--aqua-50)",
                    border: "1px solid var(--aqua-200)",
                  }}
                >
                  {step.n}
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-base font-semibold lg:text-[17px]">
                      {step.title}
                    </h4>
                    {step.keys && (
                      <span className="inline-flex gap-1">
                        {step.keys.map((k) => (
                          <span key={k} className="brand-kbd">
                            {k}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right: browser-chrome with listening state */}
        <div className="relative">
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
              <span
                className="ml-4 flex-1 truncate rounded-md border border-[color:var(--border-soft)] bg-white px-3 py-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                chat.example.ai/new
              </span>
            </div>

            <div
              className="p-6"
              style={{
                background: "linear-gradient(180deg, white, var(--bg))",
                minHeight: 320,
              }}
            >
              <div className="mb-3 text-xs font-semibold text-[color:var(--text-soft)]">
                New chat
              </div>
              <div
                className="rounded-2xl border-2 bg-white p-4"
                style={{
                  borderColor: "var(--orange)",
                  boxShadow: "0 0 0 6px rgba(255, 132, 65, 0.10)",
                }}
              >
                <div className="mb-2 flex items-center gap-2.5 text-xs text-[color:var(--text-soft)]">
                  <VoiceWave bars={5} />
                  <span>Dicteren.ai luistert…</span>
                  <span className="ml-auto font-mono">00:12</span>
                </div>
                <p className="text-[15px] leading-relaxed text-[color:var(--text)]">
                  Help me een aanbiedingsbrief schrijven voor een opdrachtgever
                  in de zorg. Het project gaat over een nieuwe instroom van 14
                  medewerkers, start in juni…
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
                  Met punctuatie
                </span>
                <span className="chip chip-navy">
                  <Globe className="size-3" strokeWidth={2.2} />
                  Nederlands V3
                </span>
              </div>
            </div>
          </div>

          {/* Floating notification */}
          <div
            className="brand-card absolute -bottom-7 -left-7 w-[240px] p-3.5"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-8 place-items-center rounded-xl"
                style={{ background: "var(--green-50)" }}
              >
                <Check
                  className="size-4"
                  strokeWidth={2.6}
                  style={{ color: "var(--green)" }}
                />
              </span>
              <div className="text-xs">
                <div className="font-semibold text-sm">Tekst geplakt</div>
                <div className="text-[11px] text-[color:var(--text-muted)]">
                  184 woorden · lokaal verwerkt
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
