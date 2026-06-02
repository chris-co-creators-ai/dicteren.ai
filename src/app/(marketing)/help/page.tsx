import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { Annotation, Callout } from "@/components/help/Annotation";
import {
  MockOnboardingDone,
  MockOnboardingDownload,
} from "@/components/help/MockOnboarding";
import { MockPermissions } from "@/components/help/MockPermissions";
import { MockTrayMac, MockTrayWindows } from "@/components/help/MockTrayIcon";
import { MockDicteerStates } from "@/components/help/MockDicteerStates";
import { MockShortcutKeys } from "@/components/help/MockShortcut";
import { MockActivation } from "@/components/help/MockActivation";
import { MockCustomWords } from "@/components/help/MockCustomWords";
import { QA, Section } from "@/components/help/QA";

export const metadata = {
  title: "Help, uitleg in gewone taal",
  description:
    "Alles over Dicteren.ai uitgelegd in eenvoudige taal. Met plaatjes van het programma erbij, zodat je precies weet wat je doet.",
};

const SECTIONS = [
  { id: "wat-is-het", number: "1", title: "Wat is dit en wat heb ik er aan?" },
  { id: "op-computer", number: "2", title: "Op je computer zetten" },
  { id: "opstarten", number: "3", title: "De eerste keer aanzetten" },
  { id: "dicteren", number: "4", title: "Voor het eerst dicteren" },
  { id: "niet-werkt", number: "5", title: "Als iets niet werkt" },
  { id: "licentie", number: "6", title: "Licentie en abonnement" },
  { id: "privacy", number: "7", title: "Privacy en veiligheid" },
  { id: "slimme-dingen", number: "8", title: "Slimme functies" },
  { id: "zakelijk", number: "9", title: "Voor de baas en collega's" },
];

export default function HelpPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-14">
        <span className="chip">Help &amp; uitleg</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Alle vragen die je kan hebben. In gewone taal.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Geen technisch verhaal, geen moeilijke woorden. Met plaatjes van het
          programma erbij, zodat je ziet wat je ziet als je het zelf doet.
        </p>
      </section>

      {/* Snelzoeker */}
      <section className="px-4 pb-4 sm:px-6 lg:px-14">
        <div className="mx-auto max-w-5xl">
          <Callout label="Snel naar het juiste stuk">
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-white"
                  style={{ color: "var(--navy)" }}
                >
                  <span
                    className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "var(--navy)" }}
                  >
                    {s.number}
                  </span>
                  {s.title}
                </a>
              ))}
            </div>
          </Callout>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 lg:px-0">
        {/* SECTIE 1 */}
        <Section
          id="wat-is-het"
          number="1"
          title="Wat is dit en wat heb ik er aan?"
          intro="We leggen eerst rustig uit wat Dicteren.ai doet. Geen techniek. Gewoon wat je eraan hebt."
        >
          <QA q="Wat doet Dicteren.ai eigenlijk?">
            <p>Je praat. Het programma typt voor je. Dat is het.</p>
            <p>
              Je drukt een knop in. Je vertelt wat je wil opschrijven. Je laat
              de knop los. Een paar tellen later staat de tekst op je scherm.
              In Word, in je mail, in WhatsApp Web, in een document. Overal
              waar je normaal zou typen.
            </p>
          </QA>

          <QA q="Wat heb ik daar aan?">
            <p>
              Drie tot vier keer sneller dan typen, en geen verkrampte
              schouders na een lange werkdag.
            </p>
            <p>
              Veel mensen merken pas hoe vermoeiend typen is als ze het niet
              meer hoeven.
            </p>
          </QA>

          <QA q="Kost het geld?">
            <p>
              Je mag het 14 dagen helemaal gratis proberen. Geen creditcard
              nodig, geen automatische verlenging.
            </p>
            <p>
              Daarna kost het <strong>12 euro per maand</strong>,{" "}
              <strong>30 euro per kwartaal</strong> of{" "}
              <strong>96 euro per jaar</strong>. Je kiest zelf. Voor bedrijven
              is er een aparte prijs per medewerker.
            </p>
            <p>Je kan altijd weer stoppen. Geen kleine lettertjes.</p>
          </QA>

          <QA q="Werkt het op mijn computer?">
            <p>Ja, op de meeste computers van de laatste zes jaar.</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Mac met chip M1, M2, M3 of M4 (van 2020 of later).</li>
              <li>Windows 10 of Windows 11.</li>
              <li>
                Minstens 2 GB werkgeheugen (RAM). Hoe meer geheugen, hoe
                langere stukken je in &eacute;&eacute;n keer kan dicteren.
              </li>
              <li>Ongeveer 1 GB vrije ruimte op je harde schijf.</li>
            </ul>
            <p>
              Weet je niet wat je hebt? Geen probleem. Stuur ons een mailtje,
              we kijken even mee.
            </p>
          </QA>

          <QA q="Heb ik een dure microfoon nodig?">
            <p>
              Nee. De microfoon die al in je laptop zit is meestal goed
              genoeg. Een eenvoudige headset werkt ook prima.
            </p>
            <p>
              Het programma is gemaakt voor standaard-Nederlands (ABN).
              Spreek je thuis Brabants, Limburgs, Fries of een ander sterk
              dialect? Dan herkent het de woorden minder goed. Praat dan
              tegen de microfoon in gewoon Nederlands.
            </p>
          </QA>
        </Section>

        {/* SECTIE 2 */}
        <Section
          id="op-computer"
          number="2"
          title="Op je computer zetten"
          intro="In stapjes. Je hoeft niets te onthouden, je leest het stap voor stap."
        >
          <QA q="Hoe haal ik het programma op?">
            <ol className="ml-5 list-decimal space-y-1.5">
              <li>
                Ga naar{" "}
                <Link
                  href="/download"
                  className="font-semibold underline"
                  style={{ color: "var(--navy)" }}
                >
                  dicteren.ai/download
                </Link>
                .
              </li>
              <li>
                Klik op de grote oranje knop. We kiezen automatisch het juiste
                bestand voor jouw computer.
              </li>
              <li>
                Wacht tot de download klaar is. Je ziet onderaan je scherm of
                in je downloads-map dat het bestand is opgeslagen.
              </li>
              <li>Dubbelklik op het bestand om de installatie te starten.</li>
            </ol>
          </QA>

          <QA q="De download wil niet starten">
            <p>Probeer dit:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Sluit je browser en open hem opnieuw.</li>
              <li>
                Werkt je internet wel? Open een andere website om dat even te
                checken.
              </li>
              <li>
                Werk je op een computer van de zaak? Soms blokkeert je IT
                bestanden van buiten. Vraag het je IT-collega.
              </li>
            </ul>
          </QA>

          <QA q="Mijn Mac zegt 'onbekende ontwikkelaar', wat nu?">
            <Annotation tone="warn">
              Dit is normaal. Apple wil dat jij zelf toestemming geeft voor
              programma&apos;s buiten hun App Store. Wij zijn een echt
              Nederlands bedrijf en niemand maakt iets stuk.
            </Annotation>
            <p>
              <strong>Zo doe je dat:</strong>
            </p>
            <ol className="ml-5 list-decimal space-y-1.5">
              <li>
                Klik rechts op het Dicteren.ai-bestand (op een Mac:{" "}
                <em>control</em> + klik).
              </li>
              <li>Kies in het menu de optie Open.</li>
              <li>
                Klik nog een keer op Open in het venster dat verschijnt.
              </li>
            </ol>
            <p>Vanaf nu opent het altijd gewoon zonder vragen.</p>
          </QA>

          <QA q="Waar staat het programma na de installatie?">
            <p>
              <strong>Op een Mac:</strong> in de map Programma&apos;s
              (Applications). Je vindt het ook via Spotlight: klik op het
              vergrootglas rechtsboven en typ Dicteren.
            </p>
            <p>
              <strong>Op Windows:</strong> in het Start-menu (linksonder).
              Klik op de Start-knop en typ Dicteren.
            </p>
          </QA>
        </Section>

        {/* SECTIE 3 */}
        <Section
          id="opstarten"
          number="3"
          title="De eerste keer aanzetten"
          intro="Bij de eerste start moet het programma even iets ophalen en je vragen om twee toestemmingen. Het kost samen ongeveer vijf minuten."
        >
          <QA q="Wat gebeurt er als ik het de eerste keer open?">
            <p>
              Je ziet een welkomstscherm. Het programma haalt eenmalig een
              Nederlands taalmodel op. Dat is ongeveer 450 MB. Daarna staat
              alles op je computer en hoef je nooit meer iets te downloaden.
            </p>
            <div className="my-5">
              <MockOnboardingDownload />
            </div>
            <Annotation>
              Het luistert nog niet naar je. Het zet alleen even het
              woordenboek klaar. Pak ondertussen een kop koffie.
            </Annotation>
          </QA>

          <QA q="Hoe weet ik dat de download gelukt is?">
            <p>Je ziet dit groene vinkje. Vanaf nu kan je gaan dicteren.</p>
            <div className="my-5">
              <MockOnboardingDone />
            </div>
          </QA>

          <QA q="Het vraagt om microfoon-toestemming. Mag dat?">
            <p>
              Ja, dat is nodig. Anders kan het programma je niet horen. Klik
              op Toestaan.
            </p>
            <p>
              Het luistert alleen wanneer jij de sneltoets indrukt. Niet op
              andere momenten.
            </p>
          </QA>

          <QA q="En 'toegankelijkheid', wat is dat?">
            <p>
              Dat klinkt vaag, maar het is simpel. Hierdoor mag het programma
              je tekst in andere programma&apos;s zetten. In Word, in je mail,
              in WhatsApp Web. Zonder die toestemming komt de tekst nergens
              uit.
            </p>
            <div className="my-5">
              <MockPermissions />
            </div>
            <Annotation>
              Toestemming staat in de Systeeminstellingen van je Mac onder
              Privacy en beveiliging. Het programma legt dit zelf ook stap
              voor stap uit als je het de eerste keer opent.
            </Annotation>
          </QA>

          <QA q="Moet ik mijn computer opnieuw opstarten?">
            <p>Nee. Je kan direct gaan dicteren.</p>
          </QA>
        </Section>

        {/* SECTIE 4 */}
        <Section
          id="dicteren"
          number="4"
          title="Voor het eerst dicteren"
          intro="Dit is het leukste deel. Drie knoppen, één gebaar, klaar."
        >
          <QA q="Welke knop moet ik indrukken?">
            <p>
              <strong>De sneltoets is: option + spatie.</strong>
            </p>
            <p>
              Op een Mac heet de option-knop ook wel alt. Hij zit tussen{" "}
              <em>cmd</em> en <em>ctrl</em>. Op Windows heet hij gewoon alt.
            </p>
            <div className="my-5">
              <MockShortcutKeys />
            </div>
            <Annotation>
              Druk je duim op <em>option</em>, hou hem ingedrukt, druk dan op
              de spatiebalk. Houd vast. Praat. Laat los. Klaar.
            </Annotation>
          </QA>

          <QA q="Hoe weet ik dat het luistert?">
            <p>
              Je ziet een klein bolletje op je scherm dat van kleur verandert.
              Dit zijn de drie toestanden:
            </p>
            <div className="my-5">
              <MockDicteerStates />
            </div>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Grijs:</strong> wacht, niets aan de hand.
              </li>
              <li>
                <strong>Oranje:</strong> luistert, praat maar.
              </li>
              <li>
                <strong>Aqua/blauw met cirkeltje:</strong> bezig met
                opschrijven, even wachten.
              </li>
            </ul>
          </QA>

          <QA q="Waar staat het programma als ik het niet zie?">
            <p>
              Het loopt in de achtergrond. Je herkent het aan een klein
              microfoon-icoon. Hier zit het:
            </p>
            <div className="my-5 grid gap-4 sm:grid-cols-2">
              <MockTrayMac />
              <MockTrayWindows />
            </div>
            <p>
              Klik op dat icoontje om het hoofdvenster weer te openen. Daar
              vind je je instellingen en geschiedenis.
            </p>
          </QA>

          <QA q="Werkt het in Word en mijn mail?">
            <p>Ja. En ook in:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Outlook en Apple Mail.</li>
              <li>WhatsApp Web en Telegram.</li>
              <li>Google Docs en Microsoft 365.</li>
              <li>ChatGPT, Gemini, Claude.</li>
              <li>Slack, Teams, alle chat-programma&apos;s.</li>
              <li>Notepad, Pages, of waar dan ook.</li>
            </ul>
            <p>Zolang je in iets kan typen, kan je erin dicteren.</p>
          </QA>

          <QA q="Mijn tekst komt op de verkeerde plek terecht">
            <p>
              Klik eerst met je muis in het tekstveld waar je wil schrijven.
              Pas dan op <em>option + spatie</em> drukken. Het programma kijkt
              waar de cursor staat en zet de tekst daar neer.
            </p>
            <Annotation>
              Tip: een cursor is dat knipperende streepje in een tekstvak.
              Daar komt jouw tekst terecht.
            </Annotation>
          </QA>

          <QA q="Hoe stop ik met dicteren?">
            <p>Laat de sneltoets los. Klaar. De tekst verschijnt vanzelf.</p>
          </QA>
        </Section>

        {/* SECTIE 5 */}
        <Section
          id="niet-werkt"
          number="5"
          title="Als iets niet werkt"
          intro="Geen paniek. Hieronder staan de problemen die mensen het meest hebben, met de oplossing erbij."
        >
          <QA q="Er gebeurt niks als ik op de sneltoets druk">
            <ol className="ml-5 list-decimal space-y-1.5">
              <li>
                Kijk of het microfoon-icoon nog rechtsboven (Mac) of
                rechtsonder (Windows) staat. Zo niet: open het programma
                opnieuw via Programma&apos;s of Start.
              </li>
              <li>
                Heb je toestemming gegeven voor de microfoon en
                toegankelijkheid? Open het programma en kijk bij
                Instellingen.
              </li>
              <li>Klik eerst met je muis in een tekstvak. Dan pas drukken.</li>
            </ol>
          </QA>

          <QA q="De tekst zit vol fouten">
            <p>Een paar dingen helpen:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Praat rustig, in normale zinnen. Niet schreeuwen.</li>
              <li>Zit niet te ver van je microfoon. Een halve meter is prima.</li>
              <li>Zet de tv of radio uit. Of doe de deur even dicht.</li>
              <li>
                Voor namen die het vaak verkeerd hoort: voeg ze toe bij Eigen
                woorden. Zie sectie 8.
              </li>
            </ul>
          </QA>

          <QA q="De microfoon doet het niet">
            <p>Test eerst of de microfoon van je computer überhaupt werkt:</p>
            <p>
              <strong>Op Mac:</strong> Systeeminstellingen, Geluid, Invoer.
              Praat en kijk of het balkje beweegt.
            </p>
            <p>
              <strong>Op Windows:</strong> Instellingen, Systeem, Geluid,
              Invoerapparaat testen.
            </p>
            <p>
              Beweegt het balkje niet? Dan zit het probleem niet bij Dicteren,
              maar bij je computer of microfoon. Een collega of familielid die
              er verstand van heeft kan dat snel oplossen.
            </p>
          </QA>

          <QA q="Het programma is helemaal weg">
            <p>Geen zorgen, niets is kwijt. Open het opnieuw via:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Mac: vergrootglas rechtsboven, typ Dicteren.</li>
              <li>Windows: Start-knop, typ Dicteren.</li>
            </ul>
          </QA>

          <QA q="Het ziet er ineens anders uit">
            <p>
              Je hebt waarschijnlijk een nieuwere versie binnengehaald. Dat
              gebeurt automatisch. De knoppen werken hetzelfde, de jas is
              alleen even gewisseld.
            </p>
          </QA>

          <QA q="Niks van bovenstaande hielp. Help.">
            <p>
              Mail ons:{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="font-semibold underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>
              . Vertel zo precies mogelijk wat er gebeurt en wat je hebt
              geprobeerd. We reageren meestal binnen één werkdag. Echte
              mensen, geen robot.
            </p>
          </QA>
        </Section>

        {/* SECTIE 6 */}
        <Section
          id="licentie"
          number="6"
          title="Licentie en abonnement"
          intro="Hier leggen we uit hoe het zit met betalen, codes en opzeggen."
        >
          <QA q="Hoe begin ik met de gratis proef?">
            <ol className="ml-5 list-decimal space-y-1.5">
              <li>
                Ga naar{" "}
                <Link
                  href="/prijzen"
                  className="font-semibold underline"
                  style={{ color: "var(--navy)" }}
                >
                  dicteren.ai/prijzen
                </Link>{" "}
                en klik op de knop om 14 dagen gratis te starten.
              </li>
              <li>Je krijgt direct een mail met een code.</li>
              <li>
                Open het programma. Klik op Licentie. Plak de code en klik op
                Activeer.
              </li>
            </ol>
            <div className="my-5">
              <MockActivation />
            </div>
          </QA>

          <QA q="Waar vind ik mijn code?">
            <p>
              In de mail die we je hebben gestuurd. Het mailadres is{" "}
              <strong>info@dicteren.ai</strong>. Kijk ook even in je map
              ongewenste mail of spam als je hem niet ziet.
            </p>
          </QA>

          <QA q="Werkt mijn licentie op meerdere computers?">
            <p>
              Elke licentie mag op <strong>twee apparaten</strong>.
              Bijvoorbeeld je werklaptop en je computer thuis. Krijg je een
              derde computer? Geen probleem. Mail ons en we verhuizen je
              licentie.
            </p>
          </QA>

          <QA q="Hoe zeg ik op?">
            <p>
              Log in op je account op{" "}
              <Link
                href="/account"
                className="font-semibold underline"
                style={{ color: "var(--navy)" }}
              >
                dicteren.ai/account
              </Link>
              . Klik op Abonnement en daarna op Stop abonnement. Klaar. Je
              kan tot het einde van de betaalde periode blijven gebruiken.
            </p>
          </QA>

          <QA q="Ik heb een nieuwe computer. Hoe verhuis ik?">
            <p>
              Installeer Dicteren.ai op de nieuwe computer. Log in met
              dezelfde mail. Activeer je code. Klaar.
            </p>
            <p>
              Zit je oude computer in de weg met je tweede plek? Mail ons
              even, we maken hem vrij.
            </p>
          </QA>
        </Section>

        {/* SECTIE 7 */}
        <Section
          id="privacy"
          number="7"
          title="Privacy en veiligheid"
          intro="Veelgestelde vraag. Eerlijk antwoord: alles wat je dicteert blijft op jouw computer."
        >
          <QA q="Wordt mijn stem opgenomen?">
            <p>
              Nee. Je stem wordt direct omgezet naar tekst, op jouw eigen
              computer. Er wordt niets opgeslagen op een server. Wij horen
              niets van wat jij zegt.
            </p>
          </QA>

          <QA q="Komt mijn tekst op het internet?">
            <p>
              Nee, ook niet. De tekst staat alleen op jouw computer. Wij zien
              hem niet.
            </p>
            <p>
              Behalve als je zelf de AI-nabewerking aanzet en koppelt aan een
              dienst zoals ChatGPT. Dan stuur je je tekst (niet je stem) naar
              die dienst. Dat doe je alleen als je dat zelf instelt.
              Standaard staat het uit.
            </p>
          </QA>

          <QA q="Kan iemand meeluisteren?">
            <p>
              Niemand kan meeluisteren. Wij niet, en je werkgever ook niet.
              Het programma luistert alleen als jij de sneltoets indrukt, en
              alleen op die seconden.
            </p>
          </QA>

          <QA q="Mag ik dit voor vertrouwelijke gesprekken gebruiken?">
            <p>
              Ja. Juist daarvoor is het gemaakt. Veel notarissen, advocaten en
              dokters gebruiken het. Omdat de tekst nooit van jouw computer
              afgaat, voldoe je gewoon aan je beroepsgeheim.
            </p>
            <Annotation>
              Werk je in een sector met extra strenge regels? Lees onze pagina{" "}
              <Link
                href="/voor-wie/advocaten"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                voor advocaten
              </Link>{" "}
              of{" "}
              <Link
                href="/voor-wie/zorgverleners"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                voor zorgverleners
              </Link>
              .
            </Annotation>
          </QA>

          <QA q="Wat als mijn computer kapot gaat?">
            <p>
              Geen probleem. Je licentie hangt aan je e-mailadres, niet aan
              je computer. Installeer Dicteren.ai op een nieuwe computer en
              activeer opnieuw. Klaar.
            </p>
          </QA>
        </Section>

        {/* SECTIE 8 */}
        <Section
          id="slimme-dingen"
          number="8"
          title="Slimme functies"
          intro="Voor als je het wat handiger wil. Dit hoeft allemaal niet. Het programma werkt ook prima zonder."
        >
          <QA q="Kan ik eigen woorden toevoegen?">
            <p>
              Ja. Bijvoorbeeld de namen van klanten, collega&apos;s, je dorp
              of moeilijke vaktermen. Hoe vaker je een woord toevoegt, hoe
              beter het programma het herkent.
            </p>
            <div className="my-5">
              <MockCustomWords />
            </div>
            <p>Te vinden onder Instellingen, bij Eigen woorden.</p>
          </QA>

          <QA q="Wat is AI-nabewerking?">
            <p>
              Dit is optioneel. Met AI-nabewerking kan het programma je tekst
              netter maken: hoofdletters erin, leestekens kloppend, en
              taalfouten eruit. Of een opsomming maken van wat je hebt
              verteld.
            </p>
            <p>
              Hiervoor heb je een eigen account nodig bij OpenAI, Anthropic
              of een ander AI-bedrijf. Of je laat het uit en doet de opmaak
              zelf. Ook prima.
            </p>
            <Annotation tone="warn">
              Belangrijk: als je dit aanzet stuurt het programma je{" "}
              <strong>tekst</strong> (niet je stem) naar zo&apos;n AI-dienst.
              Lees onze{" "}
              <Link
                href="/privacy"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                privacyverklaring
              </Link>{" "}
              voor de details.
            </Annotation>
          </QA>

          <QA q="Kan ik een andere sneltoets kiezen?">
            <p>
              Ja. Onder Instellingen, bij Sneltoetsen. Bijvoorbeeld als{" "}
              <em>option + spatie</em> al iets anders doet op jouw computer,
              kies je een andere combinatie.
            </p>
          </QA>

          <QA q="Hoe vind ik wat ik eerder heb gedicteerd?">
            <p>
              In het programma onder Geschiedenis. Je ziet daar wat je laatst
              hebt opgeschreven. Standaard worden de laatste 50 opnames
              bewaard. Dat kan je zelf instellen.
            </p>
          </QA>
        </Section>

        {/* SECTIE 9 */}
        <Section
          id="zakelijk"
          number="9"
          title="Voor de baas en collega's"
          intro="Vragen voor als je dit op het werk wil gebruiken of voor je team."
        >
          <QA q="Mag ik dit op mijn werklaptop installeren?">
            <p>
              Meestal wel. Vraag het wel even aan je IT-afdeling of leiding.
              Het is een gewoon programma, geen virus, en het maakt geen
              wijzigingen in je systeem.
            </p>
            <p>
              Stuur ze gerust onze{" "}
              <Link
                href="/zakelijk"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                pagina voor zakelijk gebruik
              </Link>{" "}
              of de{" "}
              <Link
                href="/privacy"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                privacyverklaring
              </Link>
              .
            </p>
          </QA>

          <QA q="Horen collega's mij dicteren?">
            <p>
              Alleen als ze fysiek in dezelfde kamer zitten. De microfoon
              hoort wat jij zegt, net als bij een telefoongesprek. Een
              headset met microfoon vlakbij je mond helpt om geluid voor
              jezelf te houden.
            </p>
          </QA>

          <QA q="Kan onze IT dit voor het hele team uitrollen?">
            <p>
              Ja. We hebben zakelijke licenties met centrale uitnodigingen.
              Je IT-collega kan medewerkers per e-mail uitnodigen. Iedereen
              krijgt een eigen code, maar je betaalt &eacute;&eacute;n
              factuur.
            </p>
            <p>
              Lees meer op{" "}
              <Link
                href="/zakelijk"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                dicteren.ai/zakelijk
              </Link>{" "}
              of mail{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>{" "}
              voor een offerte op maat.
            </p>
          </QA>

          <QA q="Mogen we het uitproberen met een paar mensen?">
            <p>
              Zeker. Vraag een proefperiode aan voor je team via{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>
              . We zetten dat zonder gedoe voor je klaar.
            </p>
          </QA>
        </Section>
      </div>

      {/* Contact CTA */}
      <section className="px-4 pb-24 sm:px-6 lg:px-14">
        <div
          className="mx-auto max-w-3xl rounded-2xl border p-8 text-center sm:p-10"
          style={{
            background: "var(--aqua-50)",
            borderColor: "var(--aqua-200)",
          }}
        >
          <div
            className="mx-auto grid size-12 place-items-center rounded-xl"
            style={{ background: "white" }}
          >
            <MessageCircle
              className="size-6"
              style={{ color: "var(--navy)" }}
              strokeWidth={1.8}
            />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[color:var(--navy)]">
            Staat je vraag er niet bij?
          </h2>
          <p className="mt-2 text-sm text-[color:var(--text-muted)] sm:text-base">
            Geen domme vragen. Echt niet. Stuur ons een mail of bel ons. We
            helpen je er stap voor stap doorheen.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:info@dicteren.ai"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--orange)" }}
            >
              <MessageCircle className="size-4" strokeWidth={2.2} />
              Mail ons
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold"
              style={{
                background: "white",
                color: "var(--navy)",
                borderColor: "var(--border)",
              }}
            >
              <Phone className="size-4" strokeWidth={2.2} />
              Bel ons
              <ArrowRight className="size-3.5" strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
