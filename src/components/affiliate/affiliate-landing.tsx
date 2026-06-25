// Dicteren.ai — De affiliate-/partner-landingpagina (AIDA-sales-pagina).
//
// Eén bron voor de live pagina (/[slug]) én de AM-preview bij stap 6. We hergebruiken
// de échte homepage-secties (zelfde AIDA-flow + componenten) en weven de partner erin:
// een gebrande hero (logo + merkkleur + endorsement) bovenaan en een partner-CTA
// onderaan. Geen tracking hier — de live pagina zet de RefTracker er zelf omheen.

import Link from "next/link";
import { Download, Globe, Shield, Apple, Briefcase, User, Sparkles, ArrowRight } from "lucide-react";
import { ReaderQuestionsSection } from "@/components/marketing/sections/reader-questions";
import { ProofStripSection } from "@/components/marketing/sections/proof-strip";
import { ProblemContextSection } from "@/components/marketing/sections/problem-context";
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works";
import { WorksAnywhereSection } from "@/components/marketing/sections/works-anywhere";
import { FeaturesInsideSection } from "@/components/marketing/sections/features-inside";
import { AudienceGridSection } from "@/components/marketing/sections/audience-grid";
import { PrivacySection } from "@/components/marketing/sections/privacy";
import { FaqSection } from "@/components/marketing/sections/faq";

export type LandingBrand = {
  displayName: string;
  brandColor: string | null;
  brandLogoUrl: string | null;
  welcomeMessage: string | null;
  hasConsumer: boolean;
  hasBusiness: boolean;
};

export function AffiliateLanding({ brand }: { brand: LandingBrand }) {
  return (
    <>
      <PartnerHero brand={brand} />
      <ReaderQuestionsSection />
      <ProofStripSection />
      <ProblemContextSection />
      <HowItWorksSection />
      <WorksAnywhereSection />
      <FeaturesInsideSection />
      <AudienceGridSection />
      <PrivacySection />
      <FaqSection />
      <PartnerCta brand={brand} />
    </>
  );
}

// ── A — Attention: gebrande hero met de endorsement van de partner ──────────

function PartnerHero({ brand }: { brand: LandingBrand }) {
  const { displayName, brandColor, brandLogoUrl, welcomeMessage } = brand;
  const accent = brandColor ?? "var(--orange)";
  const chipStyle = brandColor
    ? {
        background: `color-mix(in srgb, ${brandColor} 12%, white)`,
        color: brandColor,
      }
    : undefined;

  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-14 lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-20 size-[35rem] rounded-full opacity-50"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 35%, transparent), transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -left-28 size-[29rem] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, var(--aqua-200), transparent 70%)" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        {/* Links: copy + CTA's */}
        <div>
          <span className="chip mb-5 sm:mb-6" style={chipStyle}>
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full"
              style={{ background: accent }}
            />
            In samenwerking met {displayName}
          </span>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Praat.{" "}
            <span className="relative inline-block">
              En het staat er.
              <svg
                aria-hidden
                viewBox="0 0 360 18"
                className="absolute -bottom-1.5 left-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 12 Q 60 2, 120 10 T 240 8 T 358 12"
                  fill="none"
                  stroke={accent}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:mt-6 sm:text-lg">
            Dicteren.ai typt voor je, in Word, je mail en WhatsApp Web. Lokaal, op
            jouw computer.{" "}
            {`${displayName} gebruikt het zelf en raadt het z'n klanten aan.`}
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

        {/* Rechts: endorsement-kaart van de partner */}
        <div className="relative">
          <div
            className="mx-auto max-w-md rounded-3xl bg-white p-8 sm:p-10"
            style={{ border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-lg)" }}
          >
            {brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandLogoUrl}
                alt={displayName}
                className="mb-6 h-12 w-auto object-contain"
              />
            ) : (
              <span
                className="mb-6 inline-grid size-12 place-items-center rounded-2xl text-lg font-bold text-white"
                style={{ background: accent }}
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <p className="text-xl font-semibold leading-snug text-[color:var(--navy)] sm:text-2xl">
              {welcomeMessage
                ? `“${welcomeMessage}”`
                : "“Wij gebruiken Dicteren.ai zelf en raden het onze klanten aan.”"}
            </p>
            <p className="mt-5 text-sm font-semibold" style={{ color: accent }}>
              {displayName}
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Partner van Dicteren.ai
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── A — Action: gebrande slot-CTA met de drie paden + de referral-belofte ────

function PartnerCta({ brand }: { brand: LandingBrand }) {
  const { displayName, brandColor, hasConsumer, hasBusiness } = brand;
  const accent = brandColor ?? "var(--orange)";
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-14">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip" style={{ background: `color-mix(in srgb, ${accent} 12%, white)`, color: accent }}>
          Begin vandaag
        </span>
        <h2 className="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] sm:text-4xl">
          Klaar om te praten in plaats van te typen?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Kies waar je begint. Je komt binnen via {displayName}.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-3">
        {hasBusiness && (
          <CTACard
            icon={Briefcase}
            chip="Voor teams"
            title="Zakelijke licenties"
            desc="€120 per gebruiker per jaar, met volumekorting vanaf 5 seats."
            href="/zakelijk"
            cta="Bekijk zakelijk"
          />
        )}
        {hasConsumer && (
          <CTACard
            icon={User}
            chip="Persoonlijk"
            title="Voor jezelf"
            desc="€96 per jaar of €12 per maand. Twee apparaten per licentie."
            href="/prijzen"
            cta="Bekijk prijzen"
          />
        )}
        <CTACard
          icon={Sparkles}
          chip="Eerst proberen"
          title="14 dagen gratis"
          desc="Volledige app, geen creditcard nodig. Stop op elk moment."
          href="/auth/sign-up?next=/trial/start"
          cta="Start trial"
        />
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 text-center text-sm text-[color:var(--text-muted)]">
        Je bent doorverwezen via{" "}
        <strong className="text-[color:var(--navy)]">{displayName}</strong>. We
        onthouden dit 90 dagen. Koop je in die periode, dan krijgt {displayName} een
        vergoeding van ons. Voor jou maakt het niets uit.
      </div>
    </section>
  );
}

function CTACard({
  icon: Icon,
  chip,
  title,
  desc,
  href,
  cta,
}: {
  icon: typeof Briefcase;
  chip: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="brand-card flex flex-col p-6">
      <span
        className="inline-grid size-11 place-items-center rounded-2xl"
        style={{ background: "var(--aqua-50)" }}
      >
        <Icon className="size-5" strokeWidth={1.8} style={{ color: "var(--navy)" }} />
      </span>
      <span className="chip mt-4">{chip}</span>
      <h3 className="mt-3 text-lg font-bold leading-tight text-[color:var(--navy)]">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--text-muted)]">
        {desc}
      </p>
      <Link
        href={href}
        className="btn btn-primary mt-5 inline-flex items-center justify-center gap-1.5"
      >
        {cta}
        <ArrowRight className="size-3.5" strokeWidth={2.2} />
      </Link>
    </article>
  );
}
