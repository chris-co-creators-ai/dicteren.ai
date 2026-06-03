import Link from "next/link";
import { Annotation } from "@/components/help/Annotation";
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
import type { KbCategory } from "./types";

// SSOT — de volledige gebruikersdocumentatie van Dicteren.ai.
// Alle feitelijke claims (prijzen, 2 apparaten, 14 dagen, ABN-dialect) zijn
// gefactcheckt tegen .claude/skills/dicteren-app-truth.md. Wijzig je een claim,
// werk dan eerst de skill bij.

export const categories: KbCategory[] = [
  {
    slug: "wat-is-het",
    number: "1",
    title: "Wat is dit en wat heb ik er aan?",
    intro:
      "We leggen eerst rustig uit wat Dicteren.ai doet. Geen techniek. Gewoon wat je eraan hebt.",
    articles: [
      {
        slug: "wat-doet-het",
        title: "Wat doet Dicteren.ai eigenlijk?",
        summary: "Je praat, het programma typt voor je. Overal waar je normaal typt.",
        audience: "both",
        faq: true,
        body: (
          <>
            <p>Je praat. Het programma typt voor je. Dat is het.</p>
            <p>
              Je drukt een knop in. Je vertelt wat je wil opschrijven. Je laat
              de knop los. Een paar tellen later staat de tekst op je scherm. In
              Word, in je mail, in WhatsApp Web, in een document. Overal waar je
              normaal zou typen.
            </p>
          </>
        ),
      },
      {
        slug: "wat-heb-ik-eraan",
        title: "Wat heb ik daar aan?",
        summary: "Drie tot vier keer sneller dan typen, zonder verkrampte schouders.",
        audience: "visitor",
        body: (
          <>
            <p>
              Drie tot vier keer sneller dan typen, en geen verkrampte schouders
              na een lange werkdag.
            </p>
            <p>
              Veel mensen merken pas hoe vermoeiend typen is als ze het niet meer
              hoeven.
            </p>
          </>
        ),
      },
      {
        slug: "kost-het-geld",
        title: "Kost het geld?",
        summary: "14 dagen gratis proberen, daarna vanaf 12 euro per maand. Altijd opzegbaar.",
        audience: "visitor",
        faq: true,
        body: (
          <>
            <p>
              Je mag het 14 dagen helemaal gratis proberen. Geen creditcard
              nodig, geen automatische verlenging.
            </p>
            <p>
              Daarna kost het <strong>12 euro per maand</strong>,{" "}
              <strong>30 euro per kwartaal</strong> of{" "}
              <strong>96 euro per jaar</strong>. Je kiest zelf. Voor bedrijven is
              er een aparte prijs per medewerker.
            </p>
            <p>Je kan altijd weer stoppen. Geen kleine lettertjes.</p>
          </>
        ),
      },
      {
        slug: "werkt-op-mijn-computer",
        title: "Werkt het op mijn computer?",
        summary: "Mac met M1-chip of nieuwer, of Windows 10/11. Op de meeste computers van de laatste zes jaar.",
        audience: "both",
        faq: true,
        body: (
          <>
            <p>Ja, op de meeste computers van de laatste zes jaar.</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Mac met chip M1, M2, M3 of M4 (van 2020 of later).</li>
              <li>Windows 10 of Windows 11.</li>
              <li>
                Minstens 2 GB werkgeheugen (RAM). Hoe meer geheugen, hoe langere
                stukken je in één keer kan dicteren.
              </li>
              <li>Ongeveer 1 GB vrije ruimte op je harde schijf.</li>
            </ul>
            <p>
              Weet je niet wat je hebt? Geen probleem. Stuur ons een mailtje, we
              kijken even mee.
            </p>
          </>
        ),
      },
      {
        slug: "dure-microfoon",
        title: "Heb ik een dure microfoon nodig?",
        summary: "Nee. De microfoon in je laptop is meestal goed genoeg.",
        audience: "both",
        body: (
          <>
            <p>
              Nee. De microfoon die al in je laptop zit is meestal goed genoeg.
              Een eenvoudige headset werkt ook prima.
            </p>
            <p>
              Het programma is gemaakt voor standaard-Nederlands (ABN). Spreek je
              thuis Brabants, Limburgs, Fries of een ander sterk dialect? Dan
              herkent het de woorden minder goed. Praat dan tegen de microfoon in
              gewoon Nederlands.
            </p>
          </>
        ),
      },
      {
        slug: "andere-talen",
        title: "Werkt het ook in andere talen?",
        summary: "Gemaakt voor Nederlands. Engels werkt ook. Andere talen volgen later.",
        audience: "both",
        faq: true,
        body: (
          <p>
            Het model is gemaakt voor Nederlands. Engels werkt ook. Andere talen
            volgen later.
          </p>
        ),
      },
      {
        slug: "modelversie",
        title: "Welke versie wordt er gebruikt?",
        summary: "Dicteren.ai V3, gemaakt voor Nederlands. Updates krijg je automatisch.",
        audience: "both",
        faq: true,
        body: (
          <p>
            Dicteren.ai V3. Dat is een taalmodel dat is gemaakt voor Nederlands.
            Updates krijg je automatisch als je een betaalde licentie hebt.
          </p>
        ),
      },
    ],
  },
  {
    slug: "op-computer",
    number: "2",
    title: "Op je computer zetten",
    intro:
      "In stapjes. Je hoeft niets te onthouden, je leest het stap voor stap.",
    articles: [
      {
        slug: "ophalen",
        title: "Hoe haal ik het programma op?",
        summary: "Ga naar dicteren.ai/download en klik op de oranje knop.",
        audience: "both",
        body: (
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
              Wacht tot de download klaar is. Je ziet onderaan je scherm of in je
              downloads-map dat het bestand is opgeslagen.
            </li>
            <li>Dubbelklik op het bestand om de installatie te starten.</li>
          </ol>
        ),
      },
      {
        slug: "download-start-niet",
        title: "De download wil niet starten",
        summary: "Sluit je browser, check je internet, of vraag je IT bij een werkcomputer.",
        audience: "both",
        body: (
          <>
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
          </>
        ),
      },
      {
        slug: "onbekende-ontwikkelaar",
        title: "Mijn Mac zegt 'onbekende ontwikkelaar', wat nu?",
        summary: "Dat is normaal. Rechtsklik het bestand en kies Open.",
        audience: "both",
        body: (
          <>
            <Annotation tone="warn">
              Dit is normaal. Apple wil dat jij zelf toestemming geeft voor
              programma&#x2019;s buiten hun App Store. Wij zijn een echt
              Nederlands bedrijf en niemand maakt iets stuk.
            </Annotation>
            <p>
              <strong>Zo doe je dat:</strong>
            </p>
            <ol className="ml-5 list-decimal space-y-1.5">
              <li>
                Klik rechts op het Dicteren.ai-bestand (op een Mac: <em>control</em> + klik).
              </li>
              <li>Kies in het menu de optie Open.</li>
              <li>Klik nog een keer op Open in het venster dat verschijnt.</li>
            </ol>
            <p>Vanaf nu opent het altijd gewoon zonder vragen.</p>
          </>
        ),
      },
      {
        slug: "waar-staat-het",
        title: "Waar staat het programma na de installatie?",
        summary: "Op Mac in Programma's, op Windows in het Start-menu. Of via zoeken.",
        audience: "both",
        body: (
          <>
            <p>
              <strong>Op een Mac:</strong> in de map Programma&#x2019;s
              (Applications). Je vindt het ook via Spotlight: klik op het
              vergrootglas rechtsboven en typ Dicteren.
            </p>
            <p>
              <strong>Op Windows:</strong> in het Start-menu (linksonder). Klik op
              de Start-knop en typ Dicteren.
            </p>
          </>
        ),
      },
    ],
  },
  {
    slug: "opstarten",
    number: "3",
    title: "De eerste keer aanzetten",
    intro:
      "Bij de eerste start moet het programma even iets ophalen en je vragen om twee toestemmingen. Het kost samen ongeveer vijf minuten.",
    articles: [
      {
        slug: "eerste-keer",
        title: "Wat gebeurt er als ik het de eerste keer open?",
        summary: "Het haalt eenmalig een Nederlands taalmodel op. Daarna staat alles op je computer.",
        audience: "both",
        body: (
          <>
            <p>
              Je ziet een welkomstscherm. Het programma haalt eenmalig een
              Nederlands taalmodel op. Dat is ongeveer 450 MB. Daarna staat alles
              op je computer en hoef je nooit meer iets te downloaden.
            </p>
            <div className="my-5">
              <MockOnboardingDownload />
            </div>
            <Annotation>
              Het luistert nog niet naar je. Het zet alleen even het woordenboek
              klaar. Pak ondertussen een kop koffie.
            </Annotation>
          </>
        ),
      },
      {
        slug: "download-gelukt",
        title: "Hoe weet ik dat de download gelukt is?",
        summary: "Je ziet een groen vinkje. Vanaf dan kan je dicteren.",
        audience: "both",
        body: (
          <>
            <p>Je ziet dit groene vinkje. Vanaf nu kan je gaan dicteren.</p>
            <div className="my-5">
              <MockOnboardingDone />
            </div>
          </>
        ),
      },
      {
        slug: "microfoon-toestemming",
        title: "Het vraagt om microfoon-toestemming. Mag dat?",
        summary: "Ja, dat is nodig. Het luistert alleen als jij de sneltoets indrukt.",
        audience: "both",
        body: (
          <>
            <p>
              Ja, dat is nodig. Anders kan het programma je niet horen. Klik op
              Toestaan.
            </p>
            <p>
              Het luistert alleen wanneer jij de sneltoets indrukt. Niet op andere
              momenten.
            </p>
          </>
        ),
      },
      {
        slug: "toegankelijkheid",
        title: "En 'toegankelijkheid', wat is dat?",
        summary: "Hierdoor mag het programma je tekst in andere programma's zetten.",
        audience: "both",
        body: (
          <>
            <p>
              Dat klinkt vaag, maar het is simpel. Hierdoor mag het programma je
              tekst in andere programma&#x2019;s zetten. In Word, in je mail, in
              WhatsApp Web. Zonder die toestemming komt de tekst nergens uit.
            </p>
            <div className="my-5">
              <MockPermissions />
            </div>
            <Annotation>
              Toestemming staat in de Systeeminstellingen van je Mac onder Privacy
              en beveiliging. Het programma legt dit zelf ook stap voor stap uit
              als je het de eerste keer opent.
            </Annotation>
          </>
        ),
      },
      {
        slug: "opnieuw-opstarten",
        title: "Moet ik mijn computer opnieuw opstarten?",
        summary: "Nee. Je kan direct gaan dicteren.",
        audience: "both",
        body: <p>Nee. Je kan direct gaan dicteren.</p>,
      },
      {
        slug: "internet-nodig",
        title: "Heb ik internet nodig?",
        summary: "Alleen voor de eerste download. Daarna werk je gewoon offline.",
        audience: "both",
        faq: true,
        body: (
          <p>
            Alleen voor de eerste download van de app en het model. Daarna werk je
            gewoon offline.
          </p>
        ),
      },
    ],
  },
  {
    slug: "dicteren",
    number: "4",
    title: "Voor het eerst dicteren",
    intro: "Dit is het leukste deel. Drie knoppen, één gebaar, klaar.",
    articles: [
      {
        slug: "welke-knop",
        title: "Welke knop moet ik indrukken?",
        summary: "De sneltoets is option + spatie. Indrukken, praten, loslaten.",
        audience: "both",
        body: (
          <>
            <p>
              <strong>De sneltoets is: option + spatie.</strong>
            </p>
            <p>
              Op een Mac heet de option-knop ook wel alt. Hij zit tussen <em>cmd</em>{" "}
              en <em>ctrl</em>. Op Windows heet hij gewoon alt.
            </p>
            <div className="my-5">
              <MockShortcutKeys />
            </div>
            <Annotation>
              Druk je duim op <em>option</em>, hou hem ingedrukt, druk dan op de
              spatiebalk. Houd vast. Praat. Laat los. Klaar.
            </Annotation>
          </>
        ),
      },
      {
        slug: "weet-dat-het-luistert",
        title: "Hoe weet ik dat het luistert?",
        summary: "Een klein bolletje verandert van kleur: grijs, oranje, aqua.",
        audience: "both",
        body: (
          <>
            <p>
              Je ziet een klein bolletje op je scherm dat van kleur verandert. Dit
              zijn de drie toestanden:
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
                <strong>Aqua/blauw met cirkeltje:</strong> bezig met opschrijven,
                even wachten.
              </li>
            </ul>
          </>
        ),
      },
      {
        slug: "waar-staat-programma",
        title: "Waar staat het programma als ik het niet zie?",
        summary: "Het loopt op de achtergrond, te herkennen aan een klein microfoon-icoon.",
        audience: "both",
        body: (
          <>
            <p>
              Het loopt in de achtergrond. Je herkent het aan een klein
              microfoon-icoon. Hier zit het:
            </p>
            <div className="my-5 grid gap-4 sm:grid-cols-2">
              <MockTrayMac />
              <MockTrayWindows />
            </div>
            <p>
              Klik op dat icoontje om het hoofdvenster weer te openen. Daar vind je
              je instellingen en geschiedenis.
            </p>
          </>
        ),
      },
      {
        slug: "werkt-in-apps",
        title: "In welke apps kan ik dicteren?",
        summary: "Overal waar je normaal typt: mail, browser, Word, je AI-tool, chat.",
        audience: "both",
        faq: true,
        body: (
          <>
            <p>Ja. En ook in:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Outlook en Apple Mail.</li>
              <li>WhatsApp Web en Telegram.</li>
              <li>Google Docs en Microsoft 365.</li>
              <li>ChatGPT, Gemini, Claude.</li>
              <li>Slack, Teams, alle chat-programma&#x2019;s.</li>
              <li>Notepad, Pages, of waar dan ook.</li>
            </ul>
            <p>Zolang je in iets kan typen, kan je erin dicteren.</p>
          </>
        ),
      },
      {
        slug: "verkeerde-plek",
        title: "Mijn tekst komt op de verkeerde plek terecht",
        summary: "Klik eerst met je muis in het tekstveld, druk daarna pas op de sneltoets.",
        audience: "both",
        body: (
          <>
            <p>
              Klik eerst met je muis in het tekstveld waar je wil schrijven. Pas
              dan op <em>option + spatie</em> drukken. Het programma kijkt waar de
              cursor staat en zet de tekst daar neer.
            </p>
            <Annotation>
              Tip: een cursor is dat knipperende streepje in een tekstvak. Daar
              komt jouw tekst terecht.
            </Annotation>
          </>
        ),
      },
      {
        slug: "stoppen",
        title: "Hoe stop ik met dicteren?",
        summary: "Laat de sneltoets los. De tekst verschijnt vanzelf.",
        audience: "both",
        body: <p>Laat de sneltoets los. Klaar. De tekst verschijnt vanzelf.</p>,
      },
    ],
  },
  {
    slug: "niet-werkt",
    number: "5",
    title: "Als iets niet werkt",
    intro:
      "Geen paniek. Hieronder staan de problemen die mensen het meest hebben, met de oplossing erbij.",
    articles: [
      {
        slug: "niks-gebeurt",
        title: "Er gebeurt niks als ik op de sneltoets druk",
        summary: "Check het microfoon-icoon, je toestemmingen, en klik eerst in een tekstvak.",
        audience: "both",
        body: (
          <ol className="ml-5 list-decimal space-y-1.5">
            <li>
              Kijk of het microfoon-icoon nog rechtsboven (Mac) of rechtsonder
              (Windows) staat. Zo niet: open het programma opnieuw via
              Programma&#x2019;s of Start.
            </li>
            <li>
              Heb je toestemming gegeven voor de microfoon en toegankelijkheid?
              Open het programma en kijk bij Instellingen.
            </li>
            <li>Klik eerst met je muis in een tekstvak. Dan pas drukken.</li>
          </ol>
        ),
      },
      {
        slug: "vol-fouten",
        title: "De tekst zit vol fouten",
        summary: "Praat rustig, blijf dichtbij de microfoon, en voeg lastige namen toe als eigen woord.",
        audience: "both",
        body: (
          <>
            <p>Een paar dingen helpen:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Praat rustig, in normale zinnen. Niet schreeuwen.</li>
              <li>Zit niet te ver van je microfoon. Een halve meter is prima.</li>
              <li>Zet de tv of radio uit. Of doe de deur even dicht.</li>
              <li>
                Voor namen die het vaak verkeerd hoort: voeg ze toe bij Eigen
                woorden. Zie de uitleg bij Slimme functies.
              </li>
            </ul>
          </>
        ),
      },
      {
        slug: "microfoon-doet-niks",
        title: "De microfoon doet het niet",
        summary: "Test eerst of de microfoon van je computer überhaupt werkt.",
        audience: "both",
        body: (
          <>
            <p>Test eerst of de microfoon van je computer überhaupt werkt:</p>
            <p>
              <strong>Op Mac:</strong> Systeeminstellingen, Geluid, Invoer. Praat
              en kijk of het balkje beweegt.
            </p>
            <p>
              <strong>Op Windows:</strong> Instellingen, Systeem, Geluid,
              Invoerapparaat testen.
            </p>
            <p>
              Beweegt het balkje niet? Dan zit het probleem niet bij Dicteren, maar
              bij je computer of microfoon. Een collega of familielid die er
              verstand van heeft kan dat snel oplossen.
            </p>
          </>
        ),
      },
      {
        slug: "programma-weg",
        title: "Het programma is helemaal weg",
        summary: "Niets is kwijt. Open het opnieuw via zoeken op je computer.",
        audience: "both",
        body: (
          <>
            <p>Geen zorgen, niets is kwijt. Open het opnieuw via:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Mac: vergrootglas rechtsboven, typ Dicteren.</li>
              <li>Windows: Start-knop, typ Dicteren.</li>
            </ul>
          </>
        ),
      },
      {
        slug: "ziet-er-anders-uit",
        title: "Het ziet er ineens anders uit",
        summary: "Je hebt automatisch een nieuwere versie binnengehaald. De knoppen werken hetzelfde.",
        audience: "both",
        body: (
          <p>
            Je hebt waarschijnlijk een nieuwere versie binnengehaald. Dat gebeurt
            automatisch. De knoppen werken hetzelfde, de jas is alleen even
            gewisseld.
          </p>
        ),
      },
      {
        slug: "niks-hielp",
        title: "Niks van bovenstaande hielp. Help.",
        summary: "Mail info@dicteren.ai. Echte mensen, meestal binnen één werkdag.",
        audience: "both",
        body: (
          <p>
            Mail ons:{" "}
            <a
              href="mailto:info@dicteren.ai"
              className="font-semibold underline"
              style={{ color: "var(--navy)" }}
            >
              info@dicteren.ai
            </a>
            . Vertel zo precies mogelijk wat er gebeurt en wat je hebt geprobeerd.
            We reageren meestal binnen één werkdag. Echte mensen, geen robot.
          </p>
        ),
      },
    ],
  },
  {
    slug: "licentie",
    number: "6",
    title: "Licentie en abonnement",
    intro: "Hier leggen we uit hoe het zit met betalen, codes en opzeggen.",
    articles: [
      {
        slug: "gratis-proef",
        title: "Hoe begin ik met de gratis proef?",
        summary: "Start 14 dagen gratis op dicteren.ai/prijzen en activeer de code in de app.",
        audience: "both",
        body: (
          <>
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
          </>
        ),
      },
      {
        slug: "waar-vind-ik-code",
        title: "Waar vind ik mijn code?",
        summary: "In de mail van info@dicteren.ai. Kijk ook in je spam-map.",
        audience: "both",
        body: (
          <p>
            In de mail die we je hebben gestuurd. Het mailadres is{" "}
            <strong>info@dicteren.ai</strong>. Kijk ook even in je map ongewenste
            mail of spam als je hem niet ziet.
          </p>
        ),
      },
      {
        slug: "meerdere-computers",
        title: "Kan ik mijn licentie op meer dan één computer gebruiken?",
        summary: "Een persoonlijke licentie werkt op twee apparaten. Zakelijke licenties zijn per gebruiker.",
        audience: "both",
        faq: true,
        body: (
          <p>
            Elke persoonlijke licentie mag op <strong>twee apparaten</strong>,
            bijvoorbeeld je werklaptop en je computer thuis. Krijg je een derde
            computer? Geen probleem. Mail ons en we verhuizen je licentie.
            Zakelijke licenties zijn per gebruiker.
          </p>
        ),
      },
      {
        slug: "opzeggen",
        title: "Hoe zeg ik op?",
        summary: "Per maand, kwartaal of jaar, op elk moment. Je licentie loopt door tot het einde van de periode.",
        audience: "both",
        faq: true,
        interactive: "subscription",
        body: (
          <p>
            Log in op je account en ga naar{" "}
            <Link
              href="/account/billing"
              className="font-semibold underline"
              style={{ color: "var(--navy)" }}
            >
              Facturering
            </Link>
            . Klik op Abonnement opzeggen en bevestig met Ja, opzeggen. Bij
            opzegging loopt je licentie door tot het einde van de betaalde periode.
          </p>
        ),
      },
      {
        slug: "verhuizen",
        title: "Ik heb een nieuwe computer. Hoe verhuis ik?",
        summary: "Installeer op de nieuwe computer, log in met dezelfde mail, activeer je code.",
        audience: "both",
        body: (
          <>
            <p>
              Installeer Dicteren.ai op de nieuwe computer. Log in met dezelfde
              mail. Activeer je code. Klaar.
            </p>
            <p>
              Zit je oude computer in de weg met je tweede plek? Mail ons even, we
              maken hem vrij.
            </p>
          </>
        ),
      },
      {
        slug: "licentie-verloopt",
        title: "Wat als mijn licentie verloopt?",
        summary: "De app blijft werken. Nieuwe modelversies en snelle support stoppen wel.",
        audience: "both",
        faq: true,
        body: (
          <p>
            De app blijft werken. Wel stoppen nieuwe modelversies en de snelle
            support. Je kunt verlengen vanuit je account.
          </p>
        ),
      },
    ],
  },
  {
    slug: "privacy",
    number: "7",
    title: "Privacy en veiligheid",
    intro:
      "Veelgestelde vraag. Eerlijk antwoord: alles wat je dicteert blijft op jouw computer.",
    articles: [
      {
        slug: "stem-opgenomen",
        title: "Wordt mijn stem opgenomen of naar een server gestuurd?",
        summary: "Nee. Je stem wordt op je eigen computer omgezet naar tekst. Niets gaat naar een server.",
        audience: "both",
        faq: true,
        body: (
          <p>
            Nee. Je stem wordt direct omgezet naar tekst, op jouw eigen computer.
            Er wordt niets opgeslagen op een server. Wij horen niets van wat jij
            zegt.
          </p>
        ),
      },
      {
        slug: "tekst-op-internet",
        title: "Komt mijn tekst op het internet?",
        summary: "Nee, de tekst staat alleen op jouw computer, tenzij je zelf AI-nabewerking aanzet.",
        audience: "both",
        body: (
          <>
            <p>
              Nee, ook niet. De tekst staat alleen op jouw computer. Wij zien hem
              niet.
            </p>
            <p>
              Behalve als je zelf de AI-nabewerking aanzet en koppelt aan een
              dienst zoals ChatGPT. Dan stuur je je tekst (niet je stem) naar die
              dienst. Dat doe je alleen als je dat zelf instelt. Standaard staat
              het uit.
            </p>
          </>
        ),
      },
      {
        slug: "meeluisteren",
        title: "Kan iemand meeluisteren?",
        summary: "Niemand. Het programma luistert alleen op de seconden dat jij de sneltoets indrukt.",
        audience: "both",
        body: (
          <p>
            Niemand kan meeluisteren. Wij niet, en je werkgever ook niet. Het
            programma luistert alleen als jij de sneltoets indrukt, en alleen op
            die seconden.
          </p>
        ),
      },
      {
        slug: "vertrouwelijk",
        title: "Mag ik dit voor vertrouwelijke gesprekken gebruiken?",
        summary: "Ja. De tekst gaat nooit van je computer af, dus je voldoet aan je beroepsgeheim.",
        audience: "both",
        body: (
          <>
            <p>
              Ja. Juist daarvoor is het gemaakt. Veel notarissen, advocaten en
              dokters gebruiken het. Omdat de tekst nooit van jouw computer afgaat,
              voldoe je gewoon aan je beroepsgeheim.
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
          </>
        ),
      },
      {
        slug: "computer-kapot",
        title: "Wat als mijn computer kapot gaat?",
        summary: "Je licentie hangt aan je e-mailadres, niet aan je computer. Installeer opnieuw en activeer.",
        audience: "both",
        body: (
          <p>
            Geen probleem. Je licentie hangt aan je e-mailadres, niet aan je
            computer. Installeer Dicteren.ai op een nieuwe computer en activeer
            opnieuw. Klaar.
          </p>
        ),
      },
      {
        slug: "dpa",
        title: "Kunnen organisaties een DPA krijgen?",
        summary: "Ja. Vraag een DPA aan via info@dicteren.ai bij je zakelijke aanvraag.",
        audience: "both",
        faq: true,
        body: (
          <p>
            Ja. Vraag een verwerkersovereenkomst (DPA) aan via{" "}
            <a
              href="mailto:info@dicteren.ai"
              className="font-semibold underline"
              style={{ color: "var(--navy)" }}
            >
              info@dicteren.ai
            </a>{" "}
            bij je zakelijke aanvraag.
          </p>
        ),
      },
    ],
  },
  {
    slug: "slimme-dingen",
    number: "8",
    title: "Slimme functies",
    intro:
      "Voor als je het wat handiger wil. Dit hoeft allemaal niet. Het programma werkt ook prima zonder.",
    articles: [
      {
        slug: "eigen-woorden",
        title: "Kan ik eigen woorden toevoegen?",
        summary: "Ja, bijvoorbeeld namen of vaktermen. Hoe vaker toegevoegd, hoe beter herkend.",
        audience: "both",
        body: (
          <>
            <p>
              Ja. Bijvoorbeeld de namen van klanten, collega&#x2019;s, je dorp of
              moeilijke vaktermen. Hoe vaker je een woord toevoegt, hoe beter het
              programma het herkent.
            </p>
            <div className="my-5">
              <MockCustomWords />
            </div>
            <p>Te vinden onder Instellingen, bij Eigen woorden.</p>
          </>
        ),
      },
      {
        slug: "ai-nabewerking",
        title: "Wat is AI-nabewerking?",
        summary: "Optioneel: het maakt je tekst netter. Je hebt er een eigen AI-account voor nodig.",
        audience: "both",
        body: (
          <>
            <p>
              Dit is optioneel. Met AI-nabewerking kan het programma je tekst
              netter maken: hoofdletters erin, leestekens kloppend, en taalfouten
              eruit. Of een opsomming maken van wat je hebt verteld.
            </p>
            <p>
              Hiervoor heb je een eigen account nodig bij OpenAI, Anthropic of een
              ander AI-bedrijf. Of je laat het uit en doet de opmaak zelf. Ook
              prima.
            </p>
            <Annotation tone="warn">
              Belangrijk: als je dit aanzet stuurt het programma je{" "}
              <strong>tekst</strong> (niet je stem) naar zo&#x2019;n AI-dienst.
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
          </>
        ),
      },
      {
        slug: "andere-sneltoets",
        title: "Kan ik een andere sneltoets kiezen?",
        summary: "Ja, onder Instellingen bij Sneltoetsen.",
        audience: "both",
        body: (
          <p>
            Ja. Onder Instellingen, bij Sneltoetsen. Bijvoorbeeld als{" "}
            <em>option + spatie</em> al iets anders doet op jouw computer, kies je
            een andere combinatie.
          </p>
        ),
      },
      {
        slug: "geschiedenis",
        title: "Hoe vind ik wat ik eerder heb gedicteerd?",
        summary: "In het programma onder Geschiedenis. Standaard de laatste 50 opnames.",
        audience: "both",
        body: (
          <p>
            In het programma onder Geschiedenis. Je ziet daar wat je laatst hebt
            opgeschreven. Standaard worden de laatste 50 opnames bewaard. Dat kan
            je zelf instellen.
          </p>
        ),
      },
    ],
  },
  {
    slug: "zakelijk",
    number: "9",
    title: "Voor de baas en collega's",
    intro: "Vragen voor als je dit op het werk wil gebruiken of voor je team.",
    articles: [
      {
        slug: "werklaptop",
        title: "Mag ik dit op mijn werklaptop installeren?",
        summary: "Meestal wel. Vraag het je IT-afdeling. Het maakt geen wijzigingen in je systeem.",
        audience: "both",
        body: (
          <>
            <p>
              Meestal wel. Vraag het wel even aan je IT-afdeling of leiding. Het is
              een gewoon programma, geen virus, en het maakt geen wijzigingen in je
              systeem.
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
          </>
        ),
      },
      {
        slug: "collegas-horen",
        title: "Horen collega's mij dicteren?",
        summary: "Alleen als ze in dezelfde kamer zitten. Een headset houdt het geluid bij jou.",
        audience: "both",
        body: (
          <p>
            Alleen als ze fysiek in dezelfde kamer zitten. De microfoon hoort wat
            jij zegt, net als bij een telefoongesprek. Een headset met microfoon
            vlakbij je mond helpt om geluid voor jezelf te houden.
          </p>
        ),
      },
      {
        slug: "it-uitrollen",
        title: "Kan onze IT dit voor het hele team uitrollen?",
        summary: "Ja. Zakelijke licenties met centrale uitnodigingen, één factuur.",
        audience: "both",
        body: (
          <>
            <p>
              Ja. We hebben zakelijke licenties met centrale uitnodigingen. Je
              IT-collega kan medewerkers per e-mail uitnodigen. Iedereen krijgt een
              eigen code, maar je betaalt één factuur.
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
          </>
        ),
      },
      {
        slug: "uitproberen-team",
        title: "Mogen we het uitproberen met een paar mensen?",
        summary: "Zeker. Vraag een proefperiode aan voor je team via info@dicteren.ai.",
        audience: "both",
        body: (
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
        ),
      },
    ],
  },
  {
    slug: "je-account",
    number: "10",
    title: "Je account en apparaten",
    intro:
      "Ben je ingelogd? Dan vul je deze stukken in je eigen dashboard met je echte gegevens.",
    articles: [
      {
        slug: "apparaat-loskoppelen",
        title: "Een apparaat loskoppelen",
        summary: "Maak een plek vrij door een oud apparaat los te koppelen vanuit je account.",
        audience: "customer",
        interactive: "devices",
        body: (
          <>
            <p>
              Elke persoonlijke licentie werkt op twee apparaten. Wil je op een
              nieuw apparaat werken terwijl beide plekken vol zitten? Dan koppel je
              eerst een oud apparaat los om een plek vrij te maken.
            </p>
            <p>
              Log in op{" "}
              <Link
                href="/account/licenses"
                className="font-semibold underline"
                style={{ color: "var(--navy)" }}
              >
                je account
              </Link>
              . Bij elke licentie zie je de apparaten die in gebruik zijn. Klik op
              Loskoppelen bij het apparaat dat je niet meer gebruikt. De plek komt
              meteen vrij.
            </p>
          </>
        ),
      },
      {
        slug: "mijn-facturen",
        title: "Waar vind ik mijn factuur?",
        summary: "Al je facturen staan in je account onder Facturering, met Download als PDF.",
        audience: "customer",
        interactive: "invoices",
        body: (
          <>
            <p>
              Al je facturen staan in je account. Log in en ga naar{" "}
              <Link
                href="/account/billing"
                className="font-semibold underline"
                style={{ color: "var(--navy)" }}
              >
                Facturering
              </Link>
              . Open een factuur en klik op Download als PDF. Je
              bedrijfsgegevens en btw staan erop.
            </p>
            <p>
              Klopt er iets niet aan je gegevens? Mail{" "}
              <a
                href="mailto:info@dicteren.ai"
                className="underline"
                style={{ color: "var(--navy)" }}
              >
                info@dicteren.ai
              </a>
              , dan passen we het aan.
            </p>
          </>
        ),
      },
    ],
  },
];
