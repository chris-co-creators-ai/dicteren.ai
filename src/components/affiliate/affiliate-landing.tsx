// Dicteren.ai — Gedeelde presentatie van de affiliate-landingpagina.
//
// Eén bron voor zowel de live pagina (/[slug], uit de actieve affiliate) als de
// AM-preview bij stap 6 (uit de aangeleverde brand-identity op de crm_contact,
// vóór publiceren). Geen tracking hier — de live pagina zet de RefTracker er zelf
// omheen; de preview tracket niet.

import Link from "next/link";
import { Briefcase, User, Sparkles, ArrowRight } from "lucide-react";

export type LandingBrand = {
  displayName: string;
  brandColor: string | null;
  brandLogoUrl: string | null;
  welcomeMessage: string | null;
  hasConsumer: boolean;
  hasBusiness: boolean;
};

export function AffiliateLanding({ brand }: { brand: LandingBrand }) {
  const {
    displayName,
    brandColor,
    brandLogoUrl,
    welcomeMessage,
    hasConsumer,
    hasBusiness,
  } = brand;

  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 size-[28rem] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, var(--aqua-200), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        {brandLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoUrl}
            alt={displayName}
            className="mx-auto mb-6 h-12 w-auto object-contain"
          />
        )}
        <span
          className="chip"
          style={
            brandColor
              ? {
                  background: `color-mix(in srgb, ${brandColor} 14%, white)`,
                  color: brandColor,
                }
              : undefined
          }
        >
          Welkom bij Dicteren.ai
        </span>
        <h1
          className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          style={{ color: brandColor ?? "var(--navy)" }}
        >
          Doorverwezen door {displayName}.
        </h1>
        {welcomeMessage ? (
          <p className="mx-auto mt-5 max-w-2xl text-base italic text-[color:var(--text-muted)] sm:text-lg">
            &ldquo;{welcomeMessage}&rdquo;
          </p>
        ) : (
          <p className="mx-auto mt-5 max-w-2xl text-base text-[color:var(--text-muted)] sm:text-lg">
            Praat. En het staat er, in elke app. Nederlands, lokaal op je
            apparaat. Geen cloud.
          </p>
        )}
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
            variant="navy"
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
            variant="orange"
          />
        )}
        <CTACard
          icon={Sparkles}
          chip="Eerst proberen"
          title="14 dagen gratis"
          desc="Volledige app, geen creditcard nodig. Stop op elk moment."
          href="/download"
          cta="Start trial"
          variant="aqua"
        />
      </div>

      <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 text-center text-sm text-[color:var(--text-muted)]">
        Je bent doorverwezen via{" "}
        <strong className="text-[color:var(--navy)]">{displayName}</strong>. We
        onthouden dit 90 dagen — koop je in die periode, dan krijgt {displayName}{" "}
        een vergoeding van ons. Voor jou maakt het niets uit.
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
  variant,
}: {
  icon: typeof Briefcase;
  chip: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  variant: "navy" | "orange" | "aqua";
}) {
  const bgIcon =
    variant === "navy"
      ? "var(--bg-deep)"
      : variant === "orange"
        ? "var(--orange-50)"
        : "var(--aqua-50)";
  const colorIcon =
    variant === "navy"
      ? "var(--navy)"
      : variant === "orange"
        ? "var(--orange)"
        : "var(--navy)";
  return (
    <article className="brand-card flex flex-col p-6">
      <span
        className="inline-grid size-11 place-items-center rounded-2xl"
        style={{ background: bgIcon }}
      >
        <Icon className="size-5" strokeWidth={1.8} style={{ color: colorIcon }} />
      </span>
      <span className="chip mt-4">{chip}</span>
      <h3 className="mt-3 text-lg font-bold leading-tight">{title}</h3>
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
