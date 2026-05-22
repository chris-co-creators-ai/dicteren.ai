import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Download,
  Languages,
  type LucideIcon,
  Mic,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppMiniBar } from "@/components/app/app-mini-bar";
import type { Audience } from "@/lib/audiences";

function categoryIcon(meta: string): LucideIcon {
  if (meta.includes("Productiviteit")) return Zap;
  if (meta.includes("Privacy")) return Shield;
  if (meta.includes("Nederlands")) return Languages;
  if (meta.includes("Toegankelijkheid")) return Accessibility;
  return Sparkles;
}

export function AudienceLanding({ audience }: { audience: Audience }) {
  const firstUseCase = audience.useCases[0];

  return (
    <>
      {/* Hero */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <span className="chip">{audience.chip}</span>
              <span className="text-xs text-[color:var(--text-soft)]">
                · Voor wie
              </span>
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
              {audience.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
              {audience.intro}
            </p>
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/auth/sign-up?next=/trial/start"
                className="btn btn-primary btn-lg"
              >
                <Download className="size-4" />
                Start 14 dagen gratis
              </Link>
              <Link href="/blog" className="btn btn-secondary btn-lg">
                Lees ervaringen
              </Link>
            </div>
          </div>

          {/* Hero scene — composed from real components, no image required */}
          <div className="relative h-[26rem] lg:h-[28rem]">
            {/* Background blob */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 top-4 size-[20rem] rounded-full opacity-50"
              style={{
                background:
                  "radial-gradient(circle, var(--aqua-200), transparent 70%)",
              }}
            />

            {/* Stats card — back, rotated */}
            <div
              className="brand-card absolute right-2 top-3 w-48 rotate-[4deg] p-4 sm:right-6"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {audience.savingsLabel}
              </div>
              <div
                className="mt-1 text-2xl font-bold tracking-tight"
                style={{ color: "var(--navy)" }}
              >
                {audience.savingsValue}
              </div>
              <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                indicatie · interne tests
              </div>
            </div>

            {/* Use-case card — front, slight tilt opposite direction */}
            <div
              className="brand-card absolute left-0 top-20 w-[22rem] -rotate-[2deg] p-5 sm:w-[24rem]"
              style={{ boxShadow: "var(--shadow-lg)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs font-bold tracking-[0.04em]"
                  style={{ color: "var(--orange)" }}
                >
                  {firstUseCase.time}
                </span>
                <span className="chip chip-navy text-[0.625rem]">
                  {audience.chip}
                </span>
              </div>
              <div
                className="mt-3 text-lg font-bold leading-tight"
                style={{ color: "var(--navy)" }}
              >
                {firstUseCase.title}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
                {firstUseCase.desc}
              </div>
              <div
                className="mt-4 flex items-center gap-2 border-t pt-3"
                style={{
                  borderColor: "var(--border-soft)",
                  borderTopStyle: "dashed",
                }}
              >
                <span className="chip chip-green">
                  <Mic className="size-3" strokeWidth={2.2} />
                  Lokaal verwerkt
                </span>
                <span
                  className="ml-auto font-mono text-[0.6875rem]"
                  style={{ color: "var(--text-soft)" }}
                >
                  00:18
                </span>
              </div>
            </div>

            {/* Real AppMiniBar — floats in front, just like in the actual app */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <AppMiniBar visible={true} state="recording" />
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-y border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {audience.useCasesHeading}
        </h2>
        <div className="mx-auto mt-8 grid max-w-6xl gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {audience.useCases.map((uc) => (
            <div key={uc.title} className="brand-card p-5">
              <div
                className="font-mono text-xs font-bold tracking-[0.04em]"
                style={{ color: "var(--orange)" }}
              >
                {uc.time}
              </div>
              <div className="mt-2 text-base font-semibold">{uc.title}</div>
              <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                {uc.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Objections */}
      <section
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14"
        style={{ background: "var(--bg-deep)" }}
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            &ldquo;Maar… werkt dit wel voor mij?&rdquo;
          </h2>
          <div className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {audience.objections.map((o) => (
              <div
                key={o.q}
                className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5"
              >
                <div className="text-[15px] font-semibold">{o.q}</div>
                <div className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  {o.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related posts */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-5xl">
          <h3 className="text-lg font-bold sm:text-xl">Verder lezen</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audience.related.map((p) => {
              const Icon = categoryIcon(p.meta);
              const category = p.meta.split("·")[0].trim();
              return (
                <article key={p.title} className="brand-card overflow-hidden p-0">
                  <div
                    className="relative flex h-28 items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--aqua-50), var(--orange-50))",
                      borderBottom: "1px solid var(--border-soft)",
                    }}
                  >
                    <span
                      className="grid size-14 place-items-center rounded-2xl"
                      style={{
                        background: "white",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <Icon
                        className="size-7"
                        strokeWidth={1.8}
                        style={{ color: "var(--navy-500)" }}
                      />
                    </span>
                    <span
                      className="absolute right-3 top-3 chip chip-navy text-[0.625rem]"
                      style={{ boxShadow: "var(--shadow-sm)" }}
                    >
                      {category}
                    </span>
                  </div>
                  <div className="p-4">
                    <div
                      className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {p.meta}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold leading-snug">
                      {p.title}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA back to top */}
      <section className="px-4 pb-16 text-center sm:px-6 sm:pb-20 lg:px-14">
        <Link
          href="/auth/sign-up?next=/trial/start"
          className="btn btn-primary btn-lg inline-flex"
        >
          <Download className="size-4" />
          Start 14 dagen gratis
        </Link>
        <Link
          href="/voor-wie/ondernemers"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
        >
          Bekijk andere doelgroepen
          <ArrowRight className="size-3.5" strokeWidth={2.2} />
        </Link>
      </section>
    </>
  );
}
