import type { Metadata } from "next";
import Link from "next/link";
import { Check, Plus, X } from "lucide-react";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";

export const metadata: Metadata = {
  title: "Wispr Flow alternatief voor Nederland — Dicteren.ai",
  description:
    "Op zoek naar een Wispr Flow alternatief in Nederland? Dicteren.ai verwerkt je stem op je eigen computer. Geen cloud, geen 21 sub-verwerkers, Nederlandse leverancier met btw-factuur.",
  alternates: {
    canonical: "https://www.dicteren.ai/wispr-flow-alternatief",
  },
  openGraph: {
    title: "Wispr Flow alternatief voor Nederland — Dicteren.ai",
    description:
      "Dicteer in elke app op je Mac of Windows. Je stem blijft op je computer. Geen cloud, geen Amerikaanse sub-verwerkers. 14 dagen gratis proberen.",
    url: "https://www.dicteren.ai/wispr-flow-alternatief",
    type: "article",
    locale: "nl_NL",
  },
};

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
    a: "Wispr Flow stuurt je stem en regelmatige schermafbeeldingen naar Amerikaanse cloud-servers. De verwerking gebeurt bij Baseten en Soniox. Onder de CLOUD Act kan een Amerikaanse rechter toegang vragen tot die data, ongeacht waar je zit. Voor werk met beroepsgeheim, gezondheidsgegevens of klantvertrouwelijke informatie wegen Nederlandse organisaties dit risico vaak zwaar.",
    defaultOpen: true,
  },
  {
    q: "Werkt Wispr Flow offline?",
    a: "Nee. Wispr Flow heeft een actieve internetverbinding nodig. Zonder netwerk werkt het niet. Dicteren.ai werkt wel offline, omdat het taalmodel op je eigen computer staat.",
  },
  {
    q: "Hoeveel partijen verwerken mijn data bij Wispr Flow?",
    a: "21 sub-verwerkers volgens hun eigen documentatie. Onder andere Baseten en Soniox voor de transcriptie, plus OpenAI, Anthropic, AWS, Stripe en zestien anderen voor analytics, betalingen en monitoring. Bij Dicteren.ai gaat je stem nergens heen, dus er zijn geen sub-verwerkers voor audio.",
  },
  {
    q: "Wat is een Nederlands alternatief voor Wispr Flow?",
    a: "Dicteren.ai is een Nederlandse desktop-app die hetzelfde doet als Wispr Flow: je drukt een sneltoets, spreekt, en je tekst verschijnt in welke app je ook open hebt. Het verschil zit in waar de verwerking plaatsvindt. Bij Dicteren.ai op je eigen Mac of Windows, bij Wispr Flow in de Amerikaanse cloud.",
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

      {/* Hero */}
      <section className="px-6 pb-12 pt-16 lg:px-14 lg:pt-24">
        <div className="mx-auto max-w-3xl">
          <span className="chip">Vergelijking</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[color:var(--navy)] sm:text-4xl lg:text-5xl">
            Wispr Flow alternatief voor Nederland
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-[color:var(--text)]">
            Wispr Flow is een Amerikaanse spraak-naar-tekst-app die je dictaat
            naar de cloud stuurt. Dicteren.ai doet hetzelfde, maar de
            verwerking blijft op je eigen Mac of Windows. Geen 21
            sub-verwerkers, geen Amerikaanse servers, Nederlandse leverancier.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/download" className="btn btn-primary">
              14 dagen gratis proberen
            </Link>
            <Link href="/prijzen" className="btn btn-secondary">
              Bekijk de prijzen
            </Link>
          </div>
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            Geen creditcard nodig. Werkt op Mac, Windows en Linux.
          </p>
        </div>
      </section>

      {/* Wat is Wispr Flow */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-6 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-3xl">
            Wat is Wispr Flow?
          </h2>
          <p className="mt-4 text-[color:var(--text)]">
            Wispr Flow is een Amerikaanse dicteer-app die in elke app op je
            computer en telefoon werkt. Je drukt een sneltoets in, spreekt,
            en je woorden verschijnen als tekst. Het bedrijf zit in San
            Francisco. De verwerking gebeurt in de cloud bij twee externe
            AI-bedrijven: Baseten en Soniox.
          </p>
          <p className="mt-3 text-[color:var(--text)]">
            Wispr Flow maakt elke paar seconden een schermafbeelding van het
            actieve venster en stuurt die mee naar de cloud, samen met je
            audio. Volgens hun eigen documentatie zijn er 21 sub-verwerkers
            betrokken bij de service.
          </p>
        </div>
      </section>

      {/* Vergelijkingstabel */}
      <section className="bg-[color:var(--bg)] px-6 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[color:var(--border-soft)] bg-white p-7">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-3xl">
            Wispr Flow vergeleken met Dicteren.ai
          </h2>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Negen punten waarop de twee diensten verschillen.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-soft)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                  <th className="py-3 pr-4">Wat</th>
                  <th className="py-3 pr-4">Dicteren.ai</th>
                  <th className="py-3">Wispr Flow</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[color:var(--border-soft)] last:border-b-0"
                  >
                    <td className="py-3 pr-4 font-medium">{row.feature}</td>
                    <td className="py-3 pr-4 font-semibold text-[color:var(--navy)]">
                      {row.dicteren}
                    </td>
                    <td className="py-3 text-[color:var(--text-muted)]">
                      {row.wispr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[0.6875rem] text-[color:var(--text-soft)]">
            Bron Wispr Flow: hun publieke sub-processor-pagina en
            privacy-overzicht. Gecontroleerd mei 2026.
          </p>
        </div>
      </section>

      {/* Privacy uitleg */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-6 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-3xl">
            Wat betekent dat in de praktijk?
          </h2>
          <p className="mt-4 text-[color:var(--text)]">
            Bij Wispr Flow gaat elke opname die je maakt, plus regelmatige
            schermafbeeldingen, naar Amerikaanse servers. Twee externe
            AI-bedrijven verwerken je audio. Onder de CLOUD Act kan een
            Amerikaanse rechter toegang vragen tot die data, ook als jij in
            Nederland zit en je klant in Nederland werkt.
          </p>
          <p className="mt-3 text-[color:var(--text)]">
            Bij Dicteren.ai blijft de audio op je apparaat. Het taalmodel
            staat lokaal geïnstalleerd. De app heeft geen internet nodig om
            te dicteren. Geen sub-verwerker, geen cloud-route, geen
            Amerikaanse data-jurisdictie.
          </p>

          <h3 className="mt-10 text-xl font-bold text-[color:var(--navy)]">
            Voor wie maakt het verschil?
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Advocaten en notarissen",
                body: "Beroepsgeheim verbiedt dat klantcommunicatie via Amerikaanse cloud loopt. Lokale verwerking is de enige weg.",
              },
              {
                title: "Zorgprofessionals",
                body: "Patiëntgegevens in een dicteer-tool die naar de cloud stuurt is een AVG-risico. Lokale verwerking voorkomt dat.",
              },
              {
                title: "Accountants en fiscalisten",
                body: "Cliëntdossiers vallen onder geheimhouding. Lokaal opnemen voorkomt dat onbekende derden toegang krijgen.",
              },
              {
                title: "Inkoop en compliance",
                body: "Bij Dicteren.ai is er geen sub-verwerker-lijst om te beoordelen. Bij Wispr Flow zijn dat er 21.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-5"
              >
                <h4 className="font-bold text-[color:var(--navy)]">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-8 text-[color:var(--text-muted)]">
            Meer weten? Kijk op{" "}
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
          </p>
        </div>
      </section>

      {/* Hoe Dicteren.ai werkt */}
      <section className="bg-[color:var(--bg)] px-6 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-3xl">
            Hoe Dicteren.ai werkt
          </h2>
          <p className="mt-4 text-[color:var(--text)]">
            Drie stappen, geen account nodig voor de proefperiode.
          </p>
          <ol className="mt-6 space-y-4">
            {[
              {
                step: "1",
                title: "Installeer de app",
                body: "Download voor Mac, Windows of Linux. Het taalmodel komt automatisch mee, ongeveer 450 MB.",
              },
              {
                step: "2",
                title: "Druk op een sneltoets en praat",
                body: "Standaard option + spatie op Mac, ctrl + spatie op Windows. Spreek je tekst in. De app typt het waar je cursor staat.",
              },
              {
                step: "3",
                title: "Klaar",
                body: "Werkt in elke app waar je tekst kunt typen. Mail, browser, Word, je AI-tool, WhatsApp Web.",
              },
            ].map((s) => (
              <li
                key={s.step}
                className="flex gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-white p-5"
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

      {/* Korte FAQ-achtige feiten */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-6 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-3xl">
            Vergelijking in één oogopslag
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-5">
              <div className="flex items-center gap-2">
                <span
                  className="grid size-6 place-items-center rounded-full text-white"
                  style={{ background: "var(--orange)" }}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <h3 className="font-bold text-[color:var(--navy)]">
                  Dicteren.ai
                </h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--text)]">
                <li>Audio blijft op je computer</li>
                <li>Werkt zonder internet</li>
                <li>Nederlandse leverancier en support</li>
                <li>Btw-factuur, iDEAL, creditcard</li>
                <li>Vanaf 12 euro per maand</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-gray-300 text-white">
                  <X className="size-3.5" strokeWidth={3} />
                </span>
                <h3 className="font-bold text-[color:var(--navy)]">
                  Wispr Flow
                </h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--text)]">
                <li>Audio naar Amerikaanse cloud</li>
                <li>Internet verplicht</li>
                <li>Amerikaans bedrijf, Engels support</li>
                <li>Creditcard via Stripe in USD</li>
                <li>21 sub-verwerkers in de keten</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[color:var(--border-soft)] bg-white px-6 py-20 lg:px-14 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-7 text-3xl font-bold tracking-tight text-[color:var(--navy)] lg:text-4xl">
            Veelgestelde vragen
          </h2>
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
        </div>
      </section>

      {/* Final CTA — hergebruik bestaande FinalCta-section */}
      <FinalCtaSection />
    </>
  );
}
