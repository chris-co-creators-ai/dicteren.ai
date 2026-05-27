import Link from "next/link";

export const metadata = { title: "Privacy" };

const LAST_UPDATE = "22 mei 2026";

export default function PrivacyPage() {
  return (
    <main className="px-4 py-16 sm:px-6 lg:px-14 lg:py-24">
      <article className="mx-auto max-w-3xl">
        <span className="chip">Privacy</span>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Privacyverklaring
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Laatst bijgewerkt: {LAST_UPDATE}
        </p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-[color:var(--text)]">
          <section>
            <h2 className="text-xl font-bold">In het kort</h2>
            <p className="mt-3">
              Dicteren.ai is gebouwd om je spraak op je eigen computer te
              verwerken. Alles wat je dicteert blijft op jouw apparaat. Wij
              ontvangen je audio nooit en bewaren je transcripties niet.
            </p>
            <ul className="mt-4 space-y-2 text-[color:var(--text-muted)]">
              <li>
                <strong className="text-[color:var(--navy)]">Wat lokaal blijft:</strong>{" "}
                je audio-opnames, je transcripties, je geschiedenis, je instellingen.
              </li>
              <li>
                <strong className="text-[color:var(--navy)]">Wat wij wel verwerken:</strong>{" "}
                accountgegevens, licentie- en betalingsgegevens, e-mailcommunicatie.
              </li>
              <li>
                <strong className="text-[color:var(--navy)]">Wat wij niet doen:</strong>{" "}
                je stem afluisteren, je transcripties lezen, je gedrag tracken.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Wie is verantwoordelijk</h2>
            <p className="mt-3">
              Dicteren.ai, gevestigd in Nederland. Contact via{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Welke gegevens wij verwerken</h2>

            <h3 className="mt-5 text-base font-bold">Accountgegevens (verplicht)</h3>
            <p className="mt-2">
              Voor je proefperiode en licentie maken we een account aan. We
              verwerken: e-mailadres, naam, wachtwoord (gehasht), aanmaakdatum
              en verificatiestatus.
            </p>

            <h3 className="mt-5 text-base font-bold">Licentie- en apparaatgegevens</h3>
            <p className="mt-2">
              Bij activatie van je licentie slaan we op: licentiecode, plan,
              vervaldatum, en een anonieme apparaat-id (een hash van je
              machine-id, niet je naam of locatie). Zo weten we hoeveel
              apparaten een licentie gebruiken.
            </p>

            <h3 className="mt-5 text-base font-bold">Betalingsgegevens</h3>
            <p className="mt-2">
              Bij aankoop verwerken we ordergegevens (plan, bedrag, datum, een
              Mollie payment-id). Je creditcard- of bankgegevens komen niet bij
              ons binnen — die verwerkt Mollie als zelfstandige
              verantwoordelijke.
            </p>

            <h3 className="mt-5 text-base font-bold">E-mailcommunicatie</h3>
            <p className="mt-2">
              We versturen e-mails over je licentie, je proefperiode, je
              abonnement en eventuele terugbetalingen. We zien of een mail is
              afgeleverd, geopend of geklikt — dat helpt ons bij support en
              bij het verbeteren van onze communicatie.
            </p>

            <h3 className="mt-5 text-base font-bold">Wat we niet verwerken</h3>
            <p className="mt-2">
              Geen audio. Geen transcripties. Geen toetsaanslagen. Geen
              browse-gedrag zonder jouw toestemming.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Hoe spraak lokaal blijft</h2>
            <p className="mt-3">
              De Dicteren.ai-app downloadt eenmalig een Nederlands taalmodel
              naar je computer. Vanaf dat moment werkt het transcriptiedeel
              volledig offline. Geen audio wordt naar onze servers of derden
              gestuurd.
            </p>
            <p className="mt-3">
              Het model dat we gebruiken doet geen sprekerherkenning en geen
              biometrische identificatie. Voor de bron, licentie en technische
              details zie de pagina{" "}
              <Link
                href="/ai-model"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                AI-model
              </Link>
              .
            </p>
            <p className="mt-3">
              Optioneel: je kunt zelf een externe AI-provider (zoals OpenAI of
              Anthropic) instellen voor de nabewerking van je tekst. In dat
              geval stuur je je tekst — niet je audio — naar die provider met
              jouw eigen API-sleutel. Wij zien die tekst niet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Met wie we gegevens delen</h2>
            <p className="mt-3">
              Alleen met verwerkers die nodig zijn om de dienst te draaien:
            </p>
            <ul className="mt-3 space-y-2 text-[color:var(--text-muted)]">
              <li>
                <strong className="text-[color:var(--navy)]">Neon</strong>{" "}
                (database, EU) — opslag van je account en licentie.
              </li>
              <li>
                <strong className="text-[color:var(--navy)]">Resend</strong>{" "}
                (e-mail, EU) — verzending van transactionele mails.
              </li>
              <li>
                <strong className="text-[color:var(--navy)]">Mollie</strong>{" "}
                (betalingen, NL) — verwerking van betalingen en abonnementen.
              </li>
              <li>
                <strong className="text-[color:var(--navy)]">Cloudflare</strong>{" "}
                (R2/CDN) — hosting van het taalmodel en website.
              </li>
              <li>
                <strong className="text-[color:var(--navy)]">Vercel</strong>{" "}
                (hosting, EU) — hosting van website en API.
              </li>
            </ul>
            <p className="mt-3 text-[color:var(--text-muted)]">
              We verkopen geen gegevens. We delen niets met adverteerders.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Hoe lang we gegevens bewaren</h2>
            <ul className="mt-3 space-y-2 text-[color:var(--text-muted)]">
              <li>
                Accountgegevens: zolang je account bestaat. Verwijder je
                account, dan verwijderen wij je gegevens binnen 30 dagen — op
                wettelijke bewaarplichten zoals fiscaal recht na.
              </li>
              <li>
                Facturen en betalingsgegevens: 7 jaar (Nederlandse fiscale
                bewaarplicht).
              </li>
              <li>E-mail-logs: maximaal 2 jaar, daarna anoniem.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Jouw rechten</h2>
            <p className="mt-3">
              Onder de AVG heb je recht op inzage, correctie, verwijdering,
              beperking, overdraagbaarheid en bezwaar. Mail{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>
              {" "}— we reageren binnen 30 dagen. Niet tevreden? Dan kun je
              terecht bij de Autoriteit Persoonsgegevens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Cookies</h2>
            <p className="mt-3">
              We werken met vier categorieën cookies: noodzakelijk,
              functioneel, analytisch en marketing. Alleen noodzakelijke
              cookies worden zonder toestemming geplaatst — denk aan je
              sessie-token en de cookie-keuze zelf. De andere drie
              categorieën staan standaard uit en worden pas actief als jij
              dat aanvinkt in de cookie-banner of op{" "}
              <a href="/cookies" className="underline">
                /cookies
              </a>
              .
            </p>
            <p className="mt-3">
              We gebruiken Google Analytics 4 (anoniem, IP-gemaskeerd) als
              je voor de analytische categorie kiest. Met de Google Consent
              Mode v2 wordt geen data naar Google gestuurd zolang je nog
              geen toestemming hebt gegeven. Je kunt je keuze op elk moment
              wijzigen via de footer-link &ldquo;Cookie-voorkeuren
              wijzigen&rdquo;.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Beveiliging</h2>
            <p className="mt-3">
              Wachtwoorden worden gehasht opgeslagen. Verkeer tussen jouw app
              en onze server is versleuteld (HTTPS). Het tokensysteem voor
              licentie-verificatie gebruikt HMAC-SHA256 met een serverside
              secret.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Wijzigingen</h2>
            <p className="mt-3">
              Bij belangrijke wijzigingen mailen we je. De datum bovenaan deze
              pagina laat zien wanneer we voor het laatst hebben bijgewerkt.
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[color:var(--text-muted)]">
          Vragen?{" "}
          <a
            href="mailto:info@dicteren.ai"
            className="font-semibold underline hover:no-underline"
            style={{ color: "var(--navy)" }}
          >
            info@dicteren.ai
          </a>{" "}
          · Lees ook onze{" "}
          <Link
            href="/voorwaarden"
            className="font-semibold underline hover:no-underline"
            style={{ color: "var(--navy)" }}
          >
            algemene voorwaarden
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
