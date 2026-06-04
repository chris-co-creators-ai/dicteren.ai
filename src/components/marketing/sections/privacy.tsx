import {
  ArrowRight,
  Apple,
  Eye,
  FileText,
  Mic,
  PowerOff,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

export function PrivacySection() {
  const features = [
    { icon: Shield, title: "Spraak blijft lokaal", desc: "Je audio wordt op je eigen apparaat verwerkt, niet in de cloud." },
    { icon: Settings, title: "Jij kiest", desc: "Beheer zelf je sneltoetsen, geluiden en eigen woorden." },
    { icon: Eye, title: "Niemand luistert mee", desc: "We trainen niet op jouw stem." },
    { icon: RefreshCw, title: "Dicteren werkt offline", desc: "Transcriberen gebeurt op je eigen apparaat, ook zonder internet." },
  ];

  const flow: { label: string; icon: typeof Mic }[] = [
    { label: "Microfoon", icon: Mic },
    { label: "Dicteren.ai V3", icon: Sparkles },
    { label: "Tekst in je app", icon: FileText },
  ];

  return (
    <section
      className="px-6 py-20 text-white lg:px-14 lg:py-24"
      style={{ background: "var(--navy)" }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              background: "rgba(139, 225, 229, 0.18)",
              color: "var(--aqua)",
              borderColor: "rgba(139, 225, 229, 0.3)",
            }}
          >
            Privacy als beginsel
          </span>
          <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            Je stem blijft op{" "}
            <span style={{ color: "var(--aqua)" }}>jouw computer.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#bccbed] lg:text-lg">
            Dicteren.ai werkt met een lokaal taalmodel. Je audio wordt op je
            eigen apparaat omgezet naar tekst, niet in de cloud. Wat je daarna
            met de tekst doet, bepaal jij zelf.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg"
                  style={{ background: "rgba(139, 225, 229, 0.15)" }}
                >
                  <Icon
                    className="size-4"
                    strokeWidth={2}
                    style={{ color: "var(--aqua)" }}
                  />
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-[#9db1d6]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: device flow diagram */}
        <div className="relative">
          <div
            className="rounded-3xl border p-7"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              borderColor: "rgba(139, 225, 229, 0.18)",
            }}
          >
            <div className="mb-5 flex items-center gap-2.5">
              <span
                className="grid size-7 place-items-center rounded-lg"
                style={{ background: "var(--aqua-200)" }}
              >
                <Apple
                  className="size-4"
                  strokeWidth={1.8}
                  style={{ color: "var(--navy)" }}
                />
              </span>
              <span className="text-sm font-semibold">Jouw computer</span>
              <span className="chip chip-green ml-auto">privé</span>
            </div>

            <div className="flex items-center gap-2">
              {flow.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex flex-1 items-center gap-2">
                    <div
                      className="flex-1 rounded-xl border p-3.5 text-center"
                      style={{
                        background: "rgba(139, 225, 229, 0.10)",
                        borderColor: "rgba(139, 225, 229, 0.20)",
                      }}
                    >
                      <Icon
                        className="mx-auto size-5"
                        strokeWidth={2}
                        style={{ color: "var(--aqua)" }}
                      />
                      <div className="mt-1.5 text-[11px] font-semibold text-[#cfdcf3]">
                        {step.label}
                      </div>
                    </div>
                    {idx < flow.length - 1 && (
                      <ArrowRight
                        className="size-3.5 shrink-0"
                        strokeWidth={2.4}
                        style={{ color: "var(--aqua)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className="mt-5 flex items-center gap-2 rounded-lg border p-3 text-xs"
              style={{
                background: "rgba(229, 72, 77, 0.12)",
                borderStyle: "dashed",
                borderColor: "rgba(229, 72, 77, 0.5)",
                color: "#ffc8ca",
              }}
            >
              <PowerOff
                className="size-3.5"
                strokeWidth={2}
                style={{ color: "#ffc8ca" }}
              />
              Geen cloud-spraakherkenning. Geen audio-uploads.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
