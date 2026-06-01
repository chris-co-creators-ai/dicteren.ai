import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  Coins,
  Handshake,
  Headphones,
  Image as ImageIcon,
  Megaphone,
  Pen,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "Word partner",
  description:
    "Partnerprogramma van Dicteren.ai voor implementatie-partners, trainers, coaches en content creators. Wederkerende commissies, co-marketing en privacy-eerste positionering.",
};

type PartnerType = {
  icon: typeof Briefcase;
  badge: string;
  title: string;
  desc: string;
  examples: string[];
};

const PARTNER_TYPES: PartnerType[] = [
  {
    icon: Briefcase,
    badge: "Consultant of bureau",
    title: "Je werkt al bij zakelijke klanten",
    desc:
      "Je doet projecten rondom AI of slimmer werken. Dicteren.ai past in je verhaal als concreet onderdeel. Wij regelen de licenties. Jij zorgt dat het echt gebruikt wordt.",
    examples: [
      "Advocatenkantoren digitaliseren",
      "Accountants slimmer laten werken",
      "Zorgpraktijken op orde brengen",
    ],
  },
  {
    icon: BookOpen,
    badge: "Trainer of coach",
    title: "Je leert mensen iets nieuws",
    desc:
      "Je geeft training rondom productiviteit, AI of toegankelijkheid. Dicteren.ai is een tool die je deelnemers diezelfde middag al kunnen gebruiken. En je laat zien hoe privé werken eruitziet.",
    examples: [
      "Coaches voor mensen met dyslexie",
      "Trainers in AI-prompts voor teams",
      "Fysiotherapeuten voor RSI",
    ],
  },
  {
    icon: Pen,
    badge: "Content of affiliate",
    title: "Jouw publiek vertrouwt jou",
    desc:
      "Je schrijft, vlogt of podcast over slimmer werken, AI of toegankelijkheid. Met onze partner-link verdien je commissie op elke klant die door jouw kanaal komt. En je publiek krijgt een eerlijk product.",
    examples: [
      "Bloggers en YouTubers over werk",
      "AI-nieuwsbrieven en podcasts",
      "Recensies en koopadvies",
    ],
  },
];

type Benefit = {
  icon: typeof Coins;
  title: string;
  desc: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: Coins,
    title: "Commissie elke maand",
    desc:
      "Per actieve licentie krijg je commissie zolang de klant blijft. Geen eenmalig bedrag.",
  },
  {
    icon: Headphones,
    title: "Eén vaste contactpersoon",
    desc:
      "Iemand die jou kent. Voor je onboarding, klantvragen en gezamenlijke projecten.",
  },
  {
    icon: Megaphone,
    title: "Samen marketing",
    desc:
      "Webinars, case studies en blogposts samen. Als de match goed is, doen we het samen.",
  },
  {
    icon: Briefcase,
    title: "Iets nieuws aan je aanbod",
    desc:
      "Een Nederlands product met privacy als belangrijkste belofte. Niet veel partijen hebben dit.",
  },
  {
    icon: Zap,
    title: "Snelle start",
    desc:
      "Eén gesprek, één partner-dashboard, één set licenties. Geen lange certificering.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy als verkoopverhaal",
    desc:
      "Lokaal verwerkt. Geen cloud. Voor veel klanten is dat precies het verschil.",
  },
  {
    icon: Sparkles,
    title: "Als eerste de nieuwe versie",
    desc:
      "Nieuwe modelversies en functies komen eerst bij jou. Zo kun je je klanten goed adviseren.",
  },
  {
    icon: Users,
    title: "Korting voor jouw klanten",
    desc:
      "Tot 20% korting op zakelijke licenties bij meer gebruikers. Een scherpere prijs in jouw deal.",
  },
  {
    icon: ImageIcon,
    title: "Klaar-voor-gebruik materiaal",
    desc:
      "Logo's, screenshots, één-pagers en demo-video's. Pak het en plaats het.",
  },
  {
    icon: Handshake,
    title: "Nederlands en dichtbij",
    desc:
      "Nederlands product, Nederlandse markt, Nederlandse support. Korte lijnen, snelle reactie.",
  },
];

export default function PartnersPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 size-[28rem] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, var(--aqua-200), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="chip chip-orange">Partnerprogramma</span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Word partner van Dicteren.ai.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
            Help jouw klanten, lezers of cursisten beter werken met AI. Wij
            maken het product. Jij brengt het bij de mensen die het nodig
            hebben.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="mailto:info@dicteren.ai?subject=Partnership%20aanvraag%20-%20Dicteren.ai&body=Beste%20Dicteren.ai%2C%0A%0AIk%20ben%20ge%C3%AFnteresseerd%20in%20een%20partnership.%20Korte%20introductie%3A%0A%0A-%20Wie%20ik%20ben%3A%0A-%20Wat%20ik%20doe%3A%0A-%20Mijn%20doelgroep%3A%0A%0AGraag%20hoor%20ik%20van%20jullie.%0A%0AMet%20vriendelijke%20groet%2C"
              className="btn btn-primary btn-lg"
            >
              Vraag partnership aan
            </a>
            <a
              href="mailto:info@dicteren.ai?subject=Kennismaking%20Dicteren.ai%20partnership"
              className="btn btn-secondary btn-lg"
            >
              Plan een kennismaking
            </a>
          </div>
        </div>
      </section>

      {/* Partner types */}
      <section className="border-y border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Drie soorten partnerschap
          </h2>
          <p className="mt-3 text-base text-[color:var(--text-muted)]">
            Eén programma, drie ingangen. Je kiest de ingang die past bij hoe
            jij met je doelgroep werkt.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
          {PARTNER_TYPES.map((p) => {
            const Icon = p.icon;
            return (
              <article key={p.badge} className="brand-card p-6 sm:p-7">
                <span
                  className="inline-grid size-12 place-items-center rounded-2xl"
                  style={{ background: "var(--aqua-50)" }}
                >
                  <Icon
                    className="size-6"
                    strokeWidth={1.8}
                    style={{ color: "var(--navy)" }}
                  />
                </span>
                <div className="mt-4">
                  <span className="chip chip-navy text-[0.6875rem]">
                    {p.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold leading-tight">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  {p.desc}
                </p>
                <ul className="mt-4 flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-4">
                  {p.examples.map((ex) => (
                    <li
                      key={ex}
                      className="flex items-start gap-2 text-sm text-[color:var(--text)]"
                    >
                      <Check
                        className="size-3.5 shrink-0 translate-y-0.5"
                        strokeWidth={2.4}
                        style={{ color: "var(--green)" }}
                      />
                      {ex}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="chip">Voordelen</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Waarom zou je je bij ons aansluiten?
          </h2>
          <p className="mt-3 text-base text-[color:var(--text-muted)]">
            Tien concrete dingen die we voor onze partners regelen.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="brand-card p-5">
                <span
                  className="mb-3 inline-grid size-10 place-items-center rounded-xl"
                  style={{ background: "var(--orange-50)" }}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={1.8}
                    style={{ color: "var(--orange)" }}
                  />
                </span>
                <h4 className="text-[15px] font-semibold leading-tight">
                  {b.title}
                </h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--text-muted)]">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Process / How */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <span className="chip">Hoe het werkt</span>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Van eerste gesprek tot eerste klant in twee weken.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[color:var(--text-muted)]">
              We werken liever met een paar serieuze partners dan met honderden
              passieve. Daarom kennismaken eerst, daarna pas activeren.
            </p>
          </div>

          <ol className="flex flex-col gap-4">
            {[
              {
                n: 1,
                title: "Kennismaking",
                desc: "30 minuten video-call. Wat doe jij, wie zijn je klanten, wat zoeken zij?",
              },
              {
                n: 2,
                title: "Match-check",
                desc: "We bepalen samen of een partnership wederzijds zinvol is. Geen druk.",
              },
              {
                n: 3,
                title: "Onboarding",
                desc: "Affiliate-dashboard, marketing-assets, demo-licenties en een kennisbank.",
              },
              {
                n: 4,
                title: "Live",
                desc: "Eerste deal, eerste commissie, eerste case study. Vanaf hier groei je verder.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="flex gap-4 rounded-2xl border border-[color:var(--border-soft)] p-4"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white"
                  style={{ background: "var(--orange)" }}
                >
                  {step.n}
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{step.title}</div>
                  <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {step.desc}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="px-4 py-16 text-center text-white sm:px-6 sm:py-20 lg:px-14"
        style={{ background: "var(--navy)" }}
      >
        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          Klaar voor een gesprek?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-[#bccbed]">
          Stuur ons een korte intro en we plannen een kennismaking binnen een
          paar werkdagen.
        </p>
        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="mailto:info@dicteren.ai?subject=Partnership%20aanvraag%20-%20Dicteren.ai&body=Beste%20Dicteren.ai%2C%0A%0AIk%20ben%20ge%C3%AFnteresseerd%20in%20een%20partnership.%20Korte%20introductie%3A%0A%0A-%20Wie%20ik%20ben%3A%0A-%20Wat%20ik%20doe%3A%0A-%20Mijn%20doelgroep%3A%0A%0AGraag%20hoor%20ik%20van%20jullie.%0A%0AMet%20vriendelijke%20groet%2C"
            className="btn btn-primary btn-lg"
          >
            Vraag partnership aan
            <ArrowRight className="size-4" strokeWidth={2.2} />
          </a>
        </div>
      </section>
    </>
  );
}
