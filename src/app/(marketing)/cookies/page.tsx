import Link from "next/link";
import { CookiePreferencesButton } from "@/components/cookie/CookiePreferencesButton";

export const metadata = {
  title: "Cookies",
  description:
    "Welke cookies Dicteren.ai gebruikt, waarom, en hoe je je voorkeuren wijzigt.",
};

type CookieRow = {
  category: "Noodzakelijk" | "Functioneel" | "Analytisch" | "Marketing";
  name: string;
  provider: string;
  purpose: string;
  duration: string;
};

const COOKIES: CookieRow[] = [
  // Necessary
  {
    category: "Noodzakelijk",
    name: "dicteren_cookie_consent_v1",
    provider: "Dicteren.ai",
    purpose: "Bewaart je cookie-voorkeur zodat de banner niet steeds opnieuw verschijnt.",
    duration: "12 maanden",
  },
  {
    category: "Noodzakelijk",
    name: "better-auth.session_token",
    provider: "Dicteren.ai",
    purpose: "Houdt je sessie actief na inloggen. Werkt alleen na expliciete sign-in.",
    duration: "Tot je uitlogt",
  },
  {
    category: "Noodzakelijk",
    name: "ref_aff_id",
    provider: "Dicteren.ai",
    purpose:
      "Koppelt een eventuele partner-link aan je bezoek voor commissie-administratie. Wordt alleen gezet als je via een partner-URL binnenkomt.",
    duration: "90 dagen",
  },
  // Analytics
  {
    category: "Analytisch",
    name: "_ga, _ga_*",
    provider: "Google Analytics 4",
    purpose:
      "Anonieme statistieken over pagina-bezoeken, bezoek-duur en verwijzingsbronnen. Geen profielen, geen advertenties.",
    duration: "Tot 14 maanden",
  },
  // Marketing
  {
    category: "Marketing",
    name: "_gcl_au",
    provider: "Google Ads",
    purpose:
      "Conversie-tracking voor advertentie-campagnes. Pas actief als jij in deze categorie toestemming geeft.",
    duration: "90 dagen",
  },
];

function chipColor(category: CookieRow["category"]): string {
  switch (category) {
    case "Noodzakelijk": return "var(--navy)";
    case "Functioneel": return "var(--aqua)";
    case "Analytisch": return "var(--orange)";
    case "Marketing": return "#A11A1A";
  }
}

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <span className="chip">Cookies & privacy</span>
      <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-[color:var(--navy)] sm:text-5xl">
        Welke cookies wij gebruiken.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
        Korte versie: zo min mogelijk. Lange versie hieronder. Bij je eerste
        bezoek vraagt onze cookie-banner welke categorieën je toestaat. Je
        kunt die keuze altijd wijzigen.
      </p>

      <div className="mt-6">
        <CookiePreferencesButton className="btn btn-primary">
          Wijzig mijn cookie-voorkeuren
        </CookiePreferencesButton>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">De vier categorieën</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CategoryCard
            title="Noodzakelijk"
            desc="Onmisbaar om de site te laten werken. Geen toestemming nodig, geen tracking."
          />
          <CategoryCard
            title="Functioneel"
            desc="Onthoudt voorkeuren zoals taal en thema. Alleen aan als jij dit toestaat."
          />
          <CategoryCard
            title="Analytisch"
            desc="Anonieme statistieken over wat werkt op de site. Geen persoonsprofielen."
          />
          <CategoryCard
            title="Marketing"
            desc="Conversie-tracking voor advertentiecampagnes. Standaard uit, alleen aan met toestemming."
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Cookie-overzicht</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Per cookie staat hieronder waarom we hem zetten en hoe lang hij
          blijft. Wij gebruiken nooit cookies van derden zonder dat in de
          desbetreffende categorie aangevinkt is.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border-soft)] bg-[color:var(--bg)] text-left text-[11px] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                <th className="px-4 py-3">Categorie</th>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Doel</th>
                <th className="px-4 py-3">Duur</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr
                  key={c.name}
                  className="border-b border-[color:var(--border-soft)] last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                      style={{ background: chipColor(c.category) }}
                    >
                      {c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.name}</td>
                  <td className="px-4 py-3 text-xs">{c.provider}</td>
                  <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                    {c.purpose}
                  </td>
                  <td className="px-4 py-3 text-xs">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Je rechten</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[color:var(--text-muted)]">
          <li>
            <strong className="text-[color:var(--navy)]">
              Toestemming intrekken:
            </strong>{" "}
            klik op de knop bovenaan deze pagina of in de footer.
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">
              Inzage en verwijderen:
            </strong>{" "}
            zie ons{" "}
            <Link href="/privacy" className="underline">
              privacy-statement
            </Link>{" "}
            voor je AVG-rechten.
          </li>
          <li>
            <strong className="text-[color:var(--navy)]">Vragen:</strong>{" "}
            mail{" "}
            <a href="mailto:info@dicteren.ai" className="underline">
              info@dicteren.ai
            </a>
            .
          </li>
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-5 text-sm text-[color:var(--text-muted)]">
        <p>
          Pagina laatst bijgewerkt op{" "}
          {new Date().toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Wijzigingen aan deze pagina betekenen niet dat eerder gegeven
          toestemming automatisch vervalt — alleen bij een nieuwe
          consent-versie (v1, v2, ...) vragen we opnieuw.
        </p>
      </section>
    </article>
  );
}

function CategoryCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-4">
      <h3 className="text-sm font-bold text-[color:var(--navy)]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-muted)]">
        {desc}
      </p>
    </div>
  );
}
