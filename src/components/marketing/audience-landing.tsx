import Link from "next/link";
import { ArrowRight, Download, Quote } from "lucide-react";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";
import type { Audience } from "@/lib/audiences";

export function AudienceLanding({ audience }: { audience: Audience }) {
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

          {/* Hero illustration + savings card */}
          <div className="relative">
            <ImagePlaceholder
              label={audience.heroImageLabel}
              className="h-72 w-full sm:h-80 lg:h-96"
            />
            <div
              className="brand-card absolute -bottom-5 -left-3 w-56 p-3.5 sm:-left-5 sm:w-60"
              style={{ boxShadow: "var(--shadow-pop)" }}
            >
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {audience.savingsLabel}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">
                {audience.savingsValue}
              </div>
              <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
                indicatie · gebaseerd op interne tests
              </div>
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

      {/* Voorbeeld-scenario (geen echte testimonial — vervangen wanneer beta-feedback binnen is) */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div
          className="brand-card mx-auto max-w-3xl p-7 sm:p-10"
          style={{
            background:
              "linear-gradient(135deg, white, var(--aqua-50))",
          }}
        >
          <div className="flex items-center gap-2">
            <Quote
              className="size-7 -scale-x-100"
              strokeWidth={1.6}
              style={{ color: "var(--orange)" }}
            />
            <span className="chip chip-orange text-[0.625rem]">
              Voorbeeld · echte ervaringen volgen na beta
            </span>
          </div>
          <p className="mt-3 text-balance text-xl font-medium leading-snug tracking-tight sm:text-2xl">
            &ldquo;{audience.quote.text}&rdquo;
          </p>
          <div className="mt-5 text-xs text-[color:var(--text-muted)]">
            Hoe iemand in deze rol Dicteren.ai zou kunnen ervaren.
          </div>
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
            {audience.related.map((p) => (
              <article key={p.title} className="brand-card p-4">
                <ImagePlaceholder label="blog · header" className="h-28 w-full" />
                <div
                  className="mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: "var(--text-soft)" }}
                >
                  {p.meta}
                </div>
                <div className="mt-1 text-[15px] font-semibold leading-snug">
                  {p.title}
                </div>
              </article>
            ))}
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
