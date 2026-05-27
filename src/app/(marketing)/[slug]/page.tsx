// Dicteren.ai — Affiliate slug-landingspagina
//
// Catch-all op marketing-niveau. Concrete routes (/prijzen, /download, etc.)
// hebben voorrang. Reserved-slugs vallen niet in deze catch (Next.js dynamic
// segment matched alleen wat niet concreet is gerouteerd).
//
// Flow:
//   1. Lookup affiliates.slug = $slug AND status = 'active'
//   2. Niet gevonden? notFound() → Next 404
//   3. Gevonden? setRefCookie (first-touch) + render landingspagina met
//      CTA-kaarten voor consumer, business en trial.

import { notFound } from "next/navigation";
import Link from "next/link";
import { Briefcase, User, Sparkles, ArrowRight } from "lucide-react";
import { getAffiliateBySlug } from "@/lib/services/affiliateSlug";
import { setRefCookie } from "@/lib/affiliateCookie";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);
  if (!affiliate || affiliate.status !== "active") {
    return { title: "Niet gevonden · Dicteren.ai" };
  }
  const displayName = affiliate.displayName ?? affiliate.name;
  return {
    title: `Doorverwezen door ${displayName} · Dicteren.ai`,
    description: `${displayName} raadt Dicteren.ai aan. Praat. En het staat er, in elke app — Nederlands, lokaal.`,
  };
}

export default async function AffiliateSlugPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);
  if (!affiliate || affiliate.status !== "active") {
    notFound();
  }

  // Set first-touch cookie. Geen mutation als al een ref-cookie staat.
  await setRefCookie({
    affiliateId: affiliate.id,
    source: "slug",
  });

  const displayName = affiliate.displayName ?? affiliate.name;
  const hasConsumer =
    affiliate.consumerCommissionType !== null &&
    (affiliate.consumerCommissionPct > 0 ||
      affiliate.consumerCommissionFixedCents > 0);
  const hasBusiness =
    affiliate.businessCommissionType !== null &&
    (affiliate.businessCommissionPct > 0 ||
      affiliate.businessCommissionFixedCents > 0);

  return (
    <>
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
          <span className="chip chip-orange">Welkom bij Dicteren.ai</span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Doorverwezen door {displayName}.
          </h1>
          {affiliate.welcomeMessage ? (
            <p className="mx-auto mt-5 max-w-2xl text-base italic text-[color:var(--text-muted)] sm:text-lg">
              &ldquo;{affiliate.welcomeMessage}&rdquo;
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
              desc="Vanaf €96 per gebruiker per jaar. Volumekorting bij 5+ seats."
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
          <strong className="text-[color:var(--navy)]">{displayName}</strong>.
          We onthouden dit 90 dagen — koop je in die periode, dan krijgt{" "}
          {displayName} een vergoeding van ons. Voor jou maakt het niets uit.
        </div>
      </section>
    </>
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
        <Icon
          className="size-5"
          strokeWidth={1.8}
          style={{ color: colorIcon }}
        />
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
