import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  FileText,
  Globe,
  HardDrive,
  Heart,
  Lock,
  Mic,
  Plus,
  Server,
  Shield,
  ShieldOff,
  Sparkles,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { AiToolChipList } from "@/components/shared/ai-tool-chip";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";

export const metadata: Metadata = {
  title: "Wispr Flow alternatief voor Nederland — Dicteren.ai",
  description:
    "Wispr Flow stuurt je stem naar 21 sub-verwerkers in de VS. Dicteren.ai verwerkt alles op je eigen Mac of Windows. Nederlandse leverancier, btw-factuur, 14 dagen gratis.",
  alternates: {
    canonical: "https://www.dicteren.ai/wispr-flow-alternatief",
  },
  openGraph: {
    title: "Wispr Flow alternatief voor Nederland — Dicteren.ai",
    description:
      "Dezelfde sneltoets, dezelfde apps, maar je stem blijft op je computer. Geen cloud, geen Amerikaanse sub-verwerkers. 14 dagen gratis.",
    url: "https://www.dicteren.ai/wispr-flow-alternatief",
    type: "article",
    locale: "nl_NL",
  },
};

// ───── Structured data for SEO + AEO ─────

const COMPARISON_ROWS: Array<{
  feature: string;
  dicteren: string;
  wispr: string;
}> = [
  {
    feature: "Waar je stem heen gaat",
    dicteren: "Blijft op je computer",
    wispr: "Cloud bij Baseten en Soniox",
  },
  {
    feature: "Werkt offline",
    dicteren: "Ja",
    wispr: "Nee, internet verplicht",
  },
  {
    feature: "Aantal sub-verwerkers",
    dicteren: "Geen",
    wispr: "21 partijen",
  },
  {
    feature: "Land waar je gegevens staan",
    dicteren: "Nederland",
    wispr: "Verenigde Staten",
  },
  {
    feature: "Screenshots van je scherm",
    dicteren: "Nooit",
    wispr: "Elke paar seconden, naar cloud",
  },
  {
    feature: "Training op jouw stem",
    dicteren: "Nooit",
    wispr: "Standaard wel. Privacy Mode zet het uit.",
  },
  {
    feature: "Leverancier",
    dicteren: "Nederlandse onderneming",
    wispr: "Amerikaans bedrijf",
  },
  {
    feature: "Factuur",
    dicteren: "Met btw en iDEAL",
    wispr: "Creditcard via Stripe in USD",
  },
  {
    feature: "Nederlandse support",
    dicteren: "Ja, eerste taal",
    wispr: "Engels",
  },
];

const FAQS: Array<{ q: string; a: string; defaultOpen?: boolean }> = [
  {
    q: "Is Wispr Flow veilig voor Nederlandse gebruikers?",
    a: "Wispr Flow stuurt je stem en regelmatige schermafbeeldingen naar Amerikaanse cloud-servers. De verwerking gebeurt bij Baseten en Soniox. Onder de CLOUD Act kan een Amerikaanse rechter toegang vragen tot die data, ook als jij in Nederland zit. Voor werk met beroepsgeheim, gezondheidsgegevens of klantvertrouwelijke informatie wegen Nederlandse organisaties dit risico vaak zwaar.",
    defaultOpen: true,
  },
  {
    q: "Werkt Wispr Flow offline?",
    a: "Nee. Wispr Flow heeft een actieve internetverbinding nodig. Zonder netwerk werkt het niet. Dicteren.ai werkt wel offline, omdat het taalmodel op je eigen computer staat.",
  },
  {
    q: "Hoeveel partijen verwerken mijn data bij Wispr Flow?",
    a: "21 sub-verwerkers volgens hun eigen documentatie. Baseten en Soniox doen de transcriptie. Daarnaast OpenAI, Anthropic, AWS, Stripe en zestien anderen voor analytics, betalingen en monitoring. Bij Dicteren.ai gaat je stem nergens heen, dus er zijn geen sub-verwerkers voor audio.",
  },
  {
    q: "Wat is een goed Nederlands alternatief voor Wispr Flow?",
    a: "Dicteren.ai is een Nederlandse desktop-app die hetzelfde doet als Wispr Flow. Je drukt een sneltoets, spreekt, je tekst verschijnt in welke app je ook open hebt. Het verschil zit in waar de verwerking plaatsvindt. Bij Dicteren.ai op je eigen Mac of Windows, bij Wispr Flow in de Amerikaanse cloud.",
  },
  {
    q: "Werkt Dicteren.ai in dezelfde apps als Wispr Flow?",
    a: "Ja. Overal waar je tekst kunt typen. Mail, browser, Word, je AI-tool, je editor, WhatsApp Web. Sneltoets indrukken, praten, je tekst verschijnt op de cursor-positie.",
  },
  {
    q: "Is Dicteren.ai geschikt voor advocaten, zorg en accountants?",
    a: "Ja. Beroepsgroepen met geheimhoudingsplicht kiezen voor lokale verwerking omdat hun data nooit het apparaat verlaat. Geen cloud, geen sub-verwerkers, geen risico op Amerikaanse data-toegang. Voor zakelijke klanten leveren we op aanvraag een verwerkersovereenkomst naar Nederlands recht.",
  },
  {
    q: "Krijg ik een btw-factuur bij Dicteren.ai?",
    a: "Ja. Elke betaling levert een Nederlandse factuur op met 21% btw. Betalen kan met iDEAL, creditcard of factuur. Wispr Flow rekent uitsluitend in USD via creditcard.",
  },
  {
    q: "Op welke besturingssystemen werkt Dicteren.ai?",
    a: "macOS, Windows en Linux. Voor macOS heb je toegankelijkheidsrechten nodig zodat de sneltoets werkt. De app leidt je er bij de eerste start doorheen.",
  },
  {
    q: "Hoeveel kost Dicteren.ai?",
    a: "Vanaf 12 euro per maand. Per kwartaal 30 euro (17% korting). Per jaar 96 euro (33% korting). Voor zakelijke teams vanaf 120 euro per seat per jaar, met staffelkorting tot 20% vanaf 25 seats.",
  },
  {
    q: "Kan ik Dicteren.ai gratis proberen?",
    a: "Ja. 14 dagen gratis, zonder creditcard. Stopt automatisch als je niets doet. Geen verborgen kosten.",
  },
  {
    q: "Wat gebeurt er met mijn opnames in Dicteren.ai?",
    a: "Niks dat jij niet zelf doet. De audio wordt op je apparaat verwerkt en daarna weggegooid. De transcriptie blijft lokaal in je geschiedenis, tot je 'm zelf verwijdert. Wij hebben geen kopie en geen toegang.",
  },
  {
    q: "Doet Dicteren.ai aan AI-training op mijn stem?",
    a: "Nooit. Het model staat vast en wordt niet bijgetraind op gebruikersdata. Bij Wispr Flow is dit standaard wel het geval, tenzij je Privacy Mode handmatig aanzet.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Wispr Flow alternatief voor Nederland",
  description:
    "Vergelijking tussen Wispr Flow en Dicteren.ai. Lokale verwerking, Nederlandse leverancier, geen cloud, geen sub-verwerkers.",
  author: { "@type": "Organization", name: "Dicteren.ai" },
  publisher: {
    "@type": "Organization",
    name: "Dicteren.ai",
    logo: {
      "@type": "ImageObject",
      url: "https://www.dicteren.ai/email/logo.png",
    },
  },
  inLanguage: "nl-NL",
  mainEntityOfPage: "https://www.dicteren.ai/wispr-flow-alternatief",
};

export default function WisprFlowAlternativePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />

      {/* ───── Hero — herkenning + belofte + bewijs in cijfers ───── */}
      <section className="px-6 pb-12 pt-16 lg:px-14 lg:pt-24">
        <div className="mx-auto max-w-4xl">
          <span className="chip chip-orange">Voor Nederlandse ondernemers</span>
          <h1 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-[color:var(--navy)] sm:text-4xl lg:text-5xl">
            Wispr Flow zonder dat je stem naar Amerika gaat.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--text)]">
            Dezelfde sneltoets. Dezelfde apps. Je woorden verschijnen even snel.
            Het enige verschil: bij Dicteren.ai blijft je audio op je eigen Mac
            of Windows. Geen cloud, geen Amerikaanse sub-verwerkers, Nederlandse
            leverancier met btw-factuur.
          </p>

          {/* Cijfer-tegels — direct bewijs voor de snelle rationale beslisser */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              {
                value: "0",
                label: "sub-verwerkers voor jouw audio",
                detail: "Wispr Flow: 21",
                icon: ShieldOff,
              },
              {
                value: "100%",
                label: "lokaal verwerkt op je apparaat",
                detail: "Wispr Flow: cloud-only",
                icon: HardDrive,
              },
              {
                value: "NL",
                label: "leverancier, support en factuur",
                detail: "Wispr Flow: US, Engels, USD",
                icon: Globe,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="brand-card p-5"
              >
                <stat.icon
                  className="size-5"
                  strokeWidth={2}
                  style={{ color: "var(--orange)" }}
                />
                <div className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--navy)]">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-medium">{stat.label}</div>
                <div className="mt-0.5 text-xs text-[color:var(--text-soft)]">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/download" className="btn btn-primary">
              14 dagen gratis proberen
              <ArrowRight className="size-4" strokeWidth={2.2} />
            </Link>
            <Link href="/prijzen" className="btn btn-secondary">
              Bekijk de prijzen
            </Link>
            <span className="text-sm text-[color:var(--text-muted)]">
              Geen creditcard. Stopt automatisch.
            </span>
          </div>
        </div>
      </section>

      {/* ───── Proof-strip — werkt in dezelfde apps ───── */}
      <section
        className="border-y border-[color:var(--border-soft)] bg-white px-6 py-6 lg:px-14"
        aria-label="Werkt in dezelfde apps als Wispr Flow"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-soft)]">
            Werkt overal waar Wispr Flow ook werkt
          </span>
          <AiToolChipList tools={["chatgpt", "claude", "copilot", "gemini"]} />
        </div>
      </section>

      {/* ───── Het probleem — angst-motivator met feiten ───── */}
      <section className="px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="chip chip-orange">Wat er werkelijk gebeurt</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
            Waar gaat je stem heen als je dicteert?
          </h2>
          <p className="mt-3 text-[color:var(--text-muted)]">
            Twee verschillende routes voor exact hetzelfde dictaat.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-2">
          {/* Wispr-route */}
          <article className="brand-card p-7">
            <div className="mb-5 flex items-center gap-2.5">
              <span
                className="grid size-9 place-items-center rounded-xl"
                style={{ background: "var(--red-50)" }}
              >
                <Cloud
                  className="size-4.5"
                  strokeWidth={2.2}
                  style={{ color: "var(--red)" }}
                />
              </span>
              <h3 className="text-lg font-bold">Wispr Flow</h3>
              <span className="chip chip-red ml-auto">Cloud-route</span>
            </div>

            <div className="space-y-2">
              {[
                "Microfoon",
                "Wispr-app",
                "Amerikaanse server",
                "Baseten (transcriptie)",
                "Soniox (transcriptie)",
                "Tekst terug",
              ].map((step, i, arr) => (
                <div
                  key={step}
                  className="flex items-center gap-3"
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--red)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm text-[color:var(--text)]">
                    {step}
                  </span>
                  {i === arr.length - 1 && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-[color:var(--text-soft)]">
                      Eindstation
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              className="mt-5 rounded-xl border p-4 text-sm"
              style={{
                background: "#fdf3f4",
                borderColor: "var(--red-200, #fecaca)",
                color: "#7f1d1d",
              }}
            >
              <strong className="block font-bold">
                Plus: regelmatige schermafbeeldingen.
              </strong>
              Wispr Flow maakt elke paar seconden een screenshot van je actieve
              venster. Die gaan mee naar dezelfde cloud.
            </div>

            <ul className="mt-5 flex flex-col gap-2.5 text-sm">
              {[
                "Internet altijd nodig",
                "21 sub-verwerkers in de keten",
                "Onder Amerikaanse wetgeving (CLOUD Act)",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-[color:var(--text-muted)]"
                >
                  <X
                    className="size-4 shrink-0"
                    strokeWidth={2.4}
                    style={{ color: "var(--red)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          {/* Dicteren-route */}
          <article
            className="brand-card p-7"
            style={{
              borderColor: "var(--aqua-200)",
              background:
                "linear-gradient(180deg, #ffffff, var(--aqua-50))",
            }}
          >
            <div className="mb-5 flex items-center gap-2.5">
              <span
                className="grid size-9 place-items-center rounded-xl"
                style={{ background: "var(--aqua-200)" }}
              >
                <HardDrive
                  className="size-4.5"
                  strokeWidth={2}
                  style={{ color: "var(--navy)" }}
                />
              </span>
              <h3 className="text-lg font-bold">Dicteren.ai</h3>
              <span className="chip chip-green ml-auto">Lokale route</span>
            </div>

            <div className="space-y-2">
              {[
                "Microfoon",
                "Dicteren.ai V3 op je eigen computer",
                "Tekst terug",
              ].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--navy)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm text-[color:var(--text)]">
                    {step}
                  </span>
                  {i === arr.length - 1 && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-[color:var(--text-soft)]">
                      Eindstation
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              className="mt-5 rounded-xl border border-[color:var(--border-soft)] bg-white p-4 text-sm"
              style={{ color: "var(--navy)" }}
            >
              <strong className="block font-bold">
                Geen tussenstations.
              </strong>
              Het taalmodel staat lokaal op je apparaat. Geen netwerk-call,
              geen externe partij die kan meelezen.
            </div>

            <ul className="mt-5 flex flex-col gap-2.5 text-sm">
              {[
                "Werkt offline",
                "Nul sub-verwerkers voor audio",
                "Onder Nederlands recht",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-[color:var(--navy)]"
                >
                  <Check
                    className="size-4 shrink-0"
                    strokeWidth={2.4}
                    style={{ color: "var(--green)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* ───── Belofte — navy-section, status/ontplooiing ───── */}
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
              Wat je daarvoor terugkrijgt
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
              Je stem blijft op{" "}
              <span style={{ color: "var(--aqua)" }}>jouw computer.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#bccbed] lg:text-lg">
              Hetzelfde resultaat als Wispr Flow, zonder dat je een Amerikaanse
              cloud-route accepteert. Dezelfde sneltoets, dezelfde tekst, in
              dezelfde apps. Maar wat van jou is, blijft van jou.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: "Audio blijft lokaal",
                  desc: "Geen upload, geen cloud-route, geen sub-verwerker.",
                },
                {
                  icon: Wifi,
                  title: "Werkt offline",
                  desc: "Internet uit? Je dictaat werkt door.",
                },
                {
                  icon: Lock,
                  title: "Geen AI-training op je stem",
                  desc: "Het model staat vast en leert niets bij van jouw input.",
                },
                {
                  icon: Heart,
                  title: "Nederlandse leverancier",
                  desc: "Btw-factuur, iDEAL, support in jouw taal.",
                },
              ].map(({ icon: Icon, title, desc }) => (
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

          {/* Lokale flow-diagram */}
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
                  <HardDrive
                    className="size-4"
                    strokeWidth={1.8}
                    style={{ color: "var(--navy)" }}
                  />
                </span>
                <span className="text-sm font-semibold">Jouw computer</span>
                <span className="chip chip-green ml-auto">privé</span>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { label: "Microfoon", icon: Mic },
                  { label: "Dicteren.ai V3", icon: Sparkles },
                  { label: "Tekst in je app", icon: FileText },
                ].map((step, idx, arr) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.label}
                      className="flex flex-1 items-center gap-2"
                    >
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
                      {idx < arr.length - 1 && (
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
                  background: "rgba(139, 225, 229, 0.10)",
                  borderColor: "rgba(139, 225, 229, 0.3)",
                  color: "#cfdcf3",
                }}
              >
                <Server
                  className="size-3.5"
                  strokeWidth={2}
                  style={{ color: "var(--aqua)" }}
                />
                Geen externe server in de keten. Geen netwerk-uitstapje.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Voor wie maakt het verschil — segmentering ───── */}
      <section className="px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="chip">Voor wie maakt het echt verschil</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
            Welk beroep heb je?
          </h2>
          <p className="mt-3 text-[color:var(--text-muted)]">
            Voor sommige werkzaamheden is cloud-dictatie een no-go. Voor andere
            scheelt het simpelweg een hoop gedoe met compliance.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {[
            {
              title: "Advocaten en notarissen",
              pain: "Klantcommunicatie mag niet via Amerikaanse cloud. Beroepsgeheim staat in de wet.",
              gain: "Lokale verwerking voorkomt dat dossiergegevens je apparaat verlaten.",
            },
            {
              title: "Zorgprofessionals",
              pain: "Patiëntdictees in een cloud-tool is een AVG-risico, met een mogelijke datalek-meldplicht.",
              gain: "Lokaal opnemen voorkomt dat persoonsgegevens van patiënten ergens anders opduiken.",
            },
            {
              title: "Accountants en fiscalisten",
              pain: "Cliëntdossiers vallen onder geheimhouding. Cloud-verwerking via 21 partijen is moeilijk te verantwoorden.",
              gain: "Je dictaten blijven op je computer. Geen sub-verwerker om te beoordelen.",
            },
            {
              title: "Inkoop en compliance",
              pain: "Een sub-verwerker-lijst van 21 partijen, allemaal in de VS, scoort slecht in elke leverancier-review.",
              gain: "Bij Dicteren.ai is er geen sub-verwerker-lijst om te beoordelen voor audio.",
            },
          ].map((item) => (
            <article key={item.title} className="brand-card p-6">
              <h3 className="text-lg font-bold text-[color:var(--navy)]">
                {item.title}
              </h3>
              <div className="mt-4 grid gap-3">
                <div className="flex gap-2.5">
                  <X
                    className="size-4 shrink-0 translate-y-0.5"
                    strokeWidth={2.4}
                    style={{ color: "var(--red)" }}
                  />
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {item.pain}
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Check
                    className="size-4 shrink-0 translate-y-0.5"
                    strokeWidth={2.4}
                    style={{ color: "var(--green)" }}
                  />
                  <p className="text-sm text-[color:var(--text)]">
                    {item.gain}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-[color:var(--text-muted)]">
          Voor zakelijke klanten leveren we op aanvraag een verwerkers-overeenkomst
          naar Nederlands recht. Vraag 'm aan via{" "}
          <Link
            href="/contact"
            className="underline hover:text-[color:var(--navy)]"
          >
            contact
          </Link>
          .
        </p>
      </section>

      {/* ───── Vergelijkingstabel — voor de langzame ratio-beslisser ───── */}
      <section className="bg-[color:var(--bg)] px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <span className="chip">Naast elkaar gelegd</span>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
              Negen punten waarop ze verschillen.
            </h2>
          </div>

          <div className="brand-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b border-[color:var(--border-soft)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]"
                    style={{ background: "var(--bg)" }}
                  >
                    <th className="px-5 py-3.5">Wat</th>
                    <th className="px-5 py-3.5">Dicteren.ai</th>
                    <th className="px-5 py-3.5">Wispr Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-[color:var(--border-soft)] last:border-b-0"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        {row.feature}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[color:var(--navy)]">
                        {row.dicteren}
                      </td>
                      <td className="px-5 py-3.5 text-[color:var(--text-muted)]">
                        {row.wispr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-[0.6875rem] text-[color:var(--text-soft)]">
              Bron: Wispr Flow's publieke sub-processor-pagina en
              privacy-overzicht. Gecontroleerd mei 2026.
            </p>
          </div>
        </div>
      </section>

      {/* ───── Zo simpel begint het — drempel verlagen ───── */}
      <section className="px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <span className="chip chip-orange">Beginnen kost vijf minuten</span>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
              Zo werkt Dicteren.ai
            </h2>
          </div>

          <ol className="space-y-4">
            {[
              {
                step: "1",
                title: "Download de app",
                body: "Voor Mac, Windows of Linux. Het taalmodel komt mee, ongeveer 450 MB. Geen account nodig voor de proefperiode.",
              },
              {
                step: "2",
                title: "Druk op een sneltoets en praat",
                body: "Standaard option + spatie op Mac, ctrl + spatie op Windows. Spreek je tekst in. De app typt het waar je cursor staat.",
              },
              {
                step: "3",
                title: "Klaar — in elke app",
                body: "Mail, browser, Word, je AI-tool, WhatsApp Web. Overal waar je tekst kunt typen werkt het.",
              },
            ].map((s) => (
              <li
                key={s.step}
                className="brand-card flex gap-4 p-5"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full font-bold text-white"
                  style={{ background: "var(--orange)" }}
                >
                  {s.step}
                </span>
                <div>
                  <h3 className="font-bold text-[color:var(--navy)]">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── Risico-vrij proberen — angst weghalen, drempel weg ───── */}
      <section className="bg-[color:var(--bg)] px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="brand-card p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <span className="chip chip-green">14 dagen gratis</span>
                <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-3xl">
                  Probeer het. Stopt vanzelf.
                </h2>
                <p className="mt-3 text-[color:var(--text-muted)]">
                  Geen creditcard nodig. Geen automatische incasso. Geen mailing
                  achterna om je over te halen. Werkt het niet voor jou, dan
                  doe je niets en houdt het op.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {[
                    "Volledige toegang tot het model voor 14 dagen",
                    "Werkt direct in al je apps",
                    "Eén apparaat tijdens de proefperiode",
                    "Stop wanneer je wil, zonder iets in te vullen",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckCircle2
                        className="size-4 shrink-0"
                        strokeWidth={2.4}
                        style={{ color: "var(--green)" }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link href="/download" className="btn btn-primary">
                    Start je 14 dagen
                    <ArrowRight className="size-4" strokeWidth={2.2} />
                  </Link>
                  <Link
                    href="/prijzen"
                    className="text-sm font-semibold underline text-[color:var(--navy)]"
                  >
                    Prijzen vergelijken
                  </Link>
                </div>
              </div>

              <div
                className="flex items-center justify-center rounded-2xl p-8 text-center"
                style={{
                  background:
                    "linear-gradient(135deg, var(--aqua-50), var(--orange-50))",
                }}
              >
                <div>
                  <Zap
                    className="mx-auto size-10"
                    strokeWidth={1.8}
                    style={{ color: "var(--orange)" }}
                  />
                  <div className="mt-3 text-4xl font-bold text-[color:var(--navy)]">
                    5 min
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                    van download tot eerste dictaat
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FAQ — long-tail SEO + AEO ───── */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <span className="chip">Goed om te weten</span>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
              Veelgestelde vragen
            </h2>
            <p className="mt-3 text-[color:var(--text-muted)]">
              Wat mensen ons vragen voordat ze overstappen.
            </p>
          </div>
          <div>
            {FAQS.map((f, i) => (
              <details
                key={i}
                open={f.defaultOpen}
                className="border-t border-[color:var(--border-soft)] py-4 [&_summary::-webkit-details-marker]:hidden [&[open]_summary_svg]:rotate-45"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 text-base font-semibold lg:text-[17px]">
                  <Plus
                    className="size-4 shrink-0 transition-transform"
                    strokeWidth={2.4}
                    style={{ color: "var(--orange)" }}
                  />
                  {f.q}
                </summary>
                <p className="mt-2.5 pl-7 text-[15px] leading-relaxed text-[color:var(--text-muted)]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-[color:var(--text-muted)]">
            Meer over hoe wij met je gegevens omgaan op{" "}
            <Link
              href="/privacy"
              className="underline hover:text-[color:var(--navy)]"
            >
              dicteren.ai/privacy
            </Link>{" "}
            en{" "}
            <Link
              href="/ai-model"
              className="underline hover:text-[color:var(--navy)]"
            >
              dicteren.ai/ai-model
            </Link>
            .
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FinalCtaSection />
    </>
  );
}
