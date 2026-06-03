import Link from "next/link";

export const metadata = { title: "Algemene voorwaarden" };

const LAST_UPDATE = "22 mei 2026";

export default function VoorwaardenPage() {
  return (
    <main className="px-4 py-16 sm:px-6 lg:px-14 lg:py-24">
      <article className="mx-auto max-w-3xl">
        <span className="chip">Voorwaarden</span>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Algemene voorwaarden
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Laatst bijgewerkt: {LAST_UPDATE}
        </p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-[color:var(--text)]">
          <section>
            <h2 className="text-xl font-bold">1. Wie zijn wij</h2>
            <p className="mt-3">
              Dicteren.ai is een Nederlandse aanbieder van software voor
              spraakherkenning. Wij leveren de Dicteren.ai-applicatie voor
              persoonlijk en zakelijk gebruik. Contact via{" "}
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
            <h2 className="text-xl font-bold">2. Waar deze voorwaarden gelden</h2>
            <p className="mt-3">
              Deze voorwaarden gelden voor het gebruik van onze website
              dicteren.ai, het aanmaken van een account, de gratis
              proefperiode en elk betaald abonnement. Door een account aan te
              maken of een licentie te kopen ga je akkoord met deze
              voorwaarden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. De dienst</h2>
            <p className="mt-3">
              Dicteren.ai bestaat uit een desktopapplicatie voor macOS en
              Windows waarmee je via een sneltoets kunt dicteren in
              elke andere applicatie. Het taalmodel wordt eenmalig
              gedownload en werkt vervolgens op je eigen computer.
            </p>
            <p className="mt-3">
              Internet is nodig voor het downloaden van het model, het
              activeren van je licentie en periodieke licentie-checks. De
              spraakherkenning zelf werkt offline. Optionele functies zoals
              tekstnabewerking via externe AI-providers vereisen je eigen
              API-sleutel bij die provider.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Gratis proefperiode</h2>
            <p className="mt-3">
              Iedere nieuwe gebruiker krijgt eenmalig 14 dagen gratis toegang.
              Geen creditcard nodig. Na de proefperiode kun je een licentie
              kopen of de app niet meer gebruiken.
            </p>
            <p className="mt-3">
              Eén proefperiode per account en per apparaat. Misbruik (zoals
              meerdere accounts aanmaken om de proefperiode te verlengen) kan
              leiden tot blokkering.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Abonnementen en betaling</h2>
            <p className="mt-3">
              We bieden abonnementen aan per maand, kwartaal of jaar. De
              prijzen vind je op{" "}
              <Link
                href="/prijzen"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                dicteren.ai/prijzen
              </Link>
              .
            </p>
            <p className="mt-3">
              Betalingen verlopen via Mollie. Je abonnement wordt automatisch
              verlengd aan het einde van iedere periode totdat je opzegt. De
              eerste afschrijving vindt direct na je aankoop plaats; volgende
              afschrijvingen op de verlengdatum.
            </p>
            <p className="mt-3">
              Je kunt je abonnement altijd opzeggen via{" "}
              <Link
                href="/account/billing"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                je account
              </Link>
              . Bij opzegging blijft je licentie geldig tot het einde van de
              huidige betaalperiode.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Herroepingsrecht</h2>
            <p className="mt-3">
              Als consument heb je 14 dagen herroepingsrecht na aankoop. Mail
              binnen die termijn naar{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>{" "}
              voor een volledige terugbetaling. Bij terugbetaling wordt je
              licentie meteen ingetrokken.
            </p>
            <p className="mt-3">
              Heb je de proefperiode al gebruikt? Dan loopt die niet mee in
              het herroepingsrecht — die was immers gratis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Wat je met de software mag</h2>
            <p className="mt-3">
              Je krijgt een persoonlijk, niet-overdraagbaar gebruiksrecht op
              de Dicteren.ai-applicatie zolang je licentie actief is. Een
              persoonlijke licentie geldt voor maximaal twee apparaten. Een
              zakelijke licentie geldt per medewerker zoals afgesproken in je
              bestelling.
            </p>
            <p className="mt-3">
              Je mag de software niet decompileren, doorverkopen of in een
              eigen dienst opnemen zonder onze schriftelijke toestemming.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Wat wij doen en niet doen</h2>
            <p className="mt-3">
              Wij doen ons best om de dienst goed te laten werken, maar geven
              geen garantie op ononderbroken beschikbaarheid of een specifieke
              transcriptiekwaliteit. De Nederlandse taal is veelzijdig — niet
              elk dictaat zal foutloos worden omgezet.
            </p>
            <p className="mt-3">
              We mogen de software updaten, functies aanpassen of het
              taalmodel vernieuwen. Functies die in een tijdelijke
              experimentele fase zitten kunnen wijzigen of verdwijnen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">9. Aansprakelijkheid</h2>
            <p className="mt-3">
              Onze aansprakelijkheid is beperkt tot het bedrag dat je in de
              laatste twaalf maanden aan ons hebt betaald. Wij zijn niet
              aansprakelijk voor indirecte schade zoals gederfde winst of
              dataverlies. Deze beperking geldt niet bij opzet of bewuste
              roekeloosheid.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">10. Privacy</h2>
            <p className="mt-3">
              Hoe we omgaan met je gegevens lees je in onze{" "}
              <Link
                href="/privacy"
                className="font-semibold underline hover:no-underline"
                style={{ color: "var(--navy)" }}
              >
                privacyverklaring
              </Link>
              . In het kort: je dicteert lokaal op je computer en wij
              ontvangen je audio nooit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">11. Wijzigingen in de voorwaarden</h2>
            <p className="mt-3">
              We kunnen deze voorwaarden aanpassen. Bij belangrijke
              wijzigingen mailen we je minimaal 30 dagen voor ze ingaan. Ben
              je het er niet mee eens, dan kun je je abonnement opzeggen
              zonder kosten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">12. Toepasselijk recht</h2>
            <p className="mt-3">
              Op deze voorwaarden is Nederlands recht van toepassing.
              Geschillen leggen we voor aan de bevoegde rechter in Amsterdam,
              tenzij dwingend recht een andere rechtbank aanwijst.
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
            href="/privacy"
            className="font-semibold underline hover:no-underline"
            style={{ color: "var(--navy)" }}
          >
            privacyverklaring
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
