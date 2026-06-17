// Dicteren.ai — /admin/uitleg
//
// Onboarding-pagina voor account managers: legt de reseller-funnel stap voor
// stap uit. Statische uitleg (geen DB), staff-only. Intern, dus geen copy-gate,
// wel helder Nederlands (B1).

import { assertStaffPageAccess } from "@/lib/auth/session";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Uitleg · Admin" };

const FLOW: { when: string; you: string; system: string }[] = [
  {
    when: "Je hebt een lijst AI-experts",
    you: "Importeer ze (CSV) in het CRM",
    system: "Zet elke lead op Nieuw, tagt de bron, wijst een eigenaar toe",
  },
  {
    when: "Je belt en de prospect wil het deck ontvangen",
    you: 'Klik "Partnerdeck sturen" in de Partner-tab',
    system:
      "Mailt het deck vanuit jouw eigen adres met een unieke link, zet op Deck verstuurd",
  },
  {
    when: "De prospect bekijkt de deck-pagina",
    you: "Bel de warme lead na",
    system: 'Zet op Warm en maakt een taak "bekeek het deck, bel na"',
  },
  {
    when: "De prospect vult het aanmeldformulier in",
    you: "Beoordeel de aanmelding en bel voor de afspraken",
    system: 'Zet op Aangemeld en maakt een taak "beoordeel + bel"',
  },
  {
    when: "Je gaat akkoord",
    you: 'Klik "Maak reseller"',
    system:
      "Maakt de reseller-account aan en de brug naar Affiliates (commissie + pagina)",
  },
  {
    when: "Geen interesse, of nog niet",
    you: 'Kies de dispositie ("Niet geïnteresseerd" of "Bel later terug")',
    system: "Zet op Niet nu of plant een terugbel-taak. Niks valt weg",
  },
];

const COLUMNS: { name: string; meaning: string }[] = [
  { name: "Nieuw", meaning: "Nog niet benaderd. Bel en stuur het deck." },
  {
    name: "Deck verstuurd",
    meaning: "Je stuurde het partnerdeck. Je wacht op een reactie.",
  },
  {
    name: "Warm",
    meaning: "De prospect bekeek het deck. Hier zit de deal, bel na.",
  },
  {
    name: "Aangemeld",
    meaning: "De prospect vulde het formulier in. Beoordeel en bel.",
  },
  {
    name: "Reseller",
    meaning: "Actieve partner. Beheer commissie en pagina in Affiliates.",
  },
  {
    name: "Niet nu",
    meaning: "Geen interesse of geparkeerd. Je kunt later opnieuw oppakken.",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 text-xl font-bold text-[color:var(--navy)]">
      {children}
    </h2>
  );
}

export default async function AdminUitlegPage() {
  await assertStaffPageAccess("/admin/uitleg");

  return (
    <div>
      <AdminTopbar />
      <main className="mx-auto max-w-3xl px-5 py-8 lg:px-7">
        <h1 className="text-3xl font-bold text-[color:var(--navy)]">
          Zo werkt de reseller-funnel
        </h1>
        <p className="mt-3 text-[color:var(--text-muted)]">
          Deze pagina legt stap voor stap uit hoe je een AI-expert van een koude
          lead naar een actieve reseller brengt. Alles gebeurt vanuit het CRM.
          Het systeem doet het saaie werk, jij doet de gesprekken en houdt de
          regie.
        </p>

        <H2>Het bord: waar staat een lead</H2>
        <p className="mt-2 text-[color:var(--text-muted)]">
          Elke lead staat altijd in precies één kolom. Zo zie je in één blik
          waar 'ie is.
        </p>
        <div className="mt-4 space-y-2">
          {COLUMNS.map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4"
            >
              <span className="font-semibold text-[color:var(--navy)]">
                {c.name}
              </span>
              <span className="text-[color:var(--text-muted)]"> — {c.meaning}</span>
            </div>
          ))}
        </div>

        <H2>Stap voor stap: als dit, dan dat</H2>
        <p className="mt-2 text-[color:var(--text-muted)]">
          Jij doet steeds één ding. Het systeem regelt de rest.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--border-soft)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[color:var(--aqua-50,#e8f8f9)] text-left">
                <th className="p-3 font-semibold text-[color:var(--navy)]">
                  Wanneer
                </th>
                <th className="p-3 font-semibold text-[color:var(--navy)]">
                  Jij doet
                </th>
                <th className="p-3 font-semibold text-[color:var(--navy)]">
                  Het systeem doet
                </th>
              </tr>
            </thead>
            <tbody>
              {FLOW.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-[color:var(--border-soft)] align-top"
                >
                  <td className="p-3 text-[color:var(--navy)]">{r.when}</td>
                  <td className="p-3 text-[color:var(--text-muted)]">{r.you}</td>
                  <td className="p-3 text-[color:var(--text-muted)]">
                    {r.system}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2>De Partner-tab: jouw cockpit</H2>
        <p className="mt-2 text-[color:var(--text-muted)]">
          Open een persoon in het CRM (de Personen-tab) en klik op{" "}
          <strong>Partner</strong>. Je ziet drie dingen:
        </p>
        <ul className="mt-3 space-y-2 text-[color:var(--text-muted)]">
          <li>
            <strong className="text-[color:var(--navy)]">De progressie-balk</strong>{" "}
            — waar de lead staat, van Nieuw tot Reseller.
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">De NU-knop</strong> — de
            ene actie die op dit moment telt. Bij Nieuw is dat "Partnerdeck
            sturen", bij Aangemeld "Maak reseller".
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">De tijdlijn</strong> —
            wat er is gebeurd: wanneer het deck verstuurd is, wanneer het bekeken
            is, wanneer iemand zich aanmeldde. Hier kopieer je ook de deck-link.
          </li>
        </ul>

        <H2>Van prospect naar partner</H2>
        <p className="mt-2 text-[color:var(--text-muted)]">
          Zolang iemand nog geen reseller is, beheer je 'm in het CRM. Zodra je{" "}
          "Maak reseller" klikt, wordt 'ie een partner en beheer je z'n commissie
          en z'n eigen pagina in Affiliates. Let op: een aanmelding alleen maakt
          nog geen reseller. Jij beoordeelt en beslist.
        </p>

        <H2>Veelgestelde situaties</H2>
        <ul className="mt-3 space-y-2 text-[color:var(--text-muted)]">
          <li>
            <strong className="text-[color:var(--navy)]">
              De prospect reageert niet.
            </strong>{" "}
            De follow-up loopt vanzelf door. Na de laatste poging zonder reactie
            gaat 'ie naar Niet nu. Niks valt weg, je kunt later opnieuw oppakken.
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">
              Geen e-mailadres.
            </strong>{" "}
            Dan kun je het deck niet mailen, maar bellen blijft mogelijk.
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">
              Iemand meldt zich zelf aan via de site.
            </strong>{" "}
            Die komt direct op Aangemeld, met een taak voor de toegewezen AM.
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">
              Vanuit welk adres gaat de mail?
            </strong>{" "}
            Vanuit jouw eigen @dicteren.ai-adres. Antwoorden van de prospect komen
            bij jou in de inbox.
          </li>
        </ul>

        <p className="mt-12 text-sm text-[color:var(--text-soft,#5b6b86)]">
          Vragen over de funnel? Stem af met Chris.
        </p>
      </main>
    </div>
  );
}
