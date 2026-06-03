import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { CookiePreferencesButton } from "@/components/cookie/CookiePreferencesButton";

type FooterColumn = {
  title: string;
  links: { label: string; href: string }[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Voor AI-tools", href: "/product/ai-tools" },
      { label: "Prijzen", href: "/prijzen" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Voor wie",
    links: [
      { label: "Ondernemers", href: "/voor-wie/ondernemers" },
      { label: "Advocaten", href: "/voor-wie/advocaten" },
      { label: "Zorgprofessionals", href: "/voor-wie/zorgprofessionals" },
      { label: "Coaches & therapeuten", href: "/voor-wie/coaches-therapeuten" },
      { label: "Accountants", href: "/voor-wie/accountants-administratie" },
      { label: "Makelaars", href: "/voor-wie/makelaars" },
      { label: "Recruiters & HR", href: "/voor-wie/recruiters-hr" },
      { label: "Studenten", href: "/voor-wie/studenten-onderzoekers" },
    ],
  },
  {
    title: "Zakelijk",
    links: [
      { label: "Overzicht", href: "/zakelijk" },
      { label: "Affiliate partners", href: "/zakelijk/affiliate-partners" },
      { label: "Wispr Flow alternatief", href: "/wispr-flow-alternatief" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Kennisbank", href: "/kennisbank" },
      { label: "Veelgestelde vragen", href: "/veelgestelde-vragen" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/blog" },
      { label: "Over ons", href: "/over-ons" },
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Voorwaarden", href: "/voorwaarden" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-[color:var(--border-soft)] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo height={32} />
            <p className="mt-4 max-w-sm text-sm text-[color:var(--text-muted)]">
              Lokaal dicteren voor Nederlandse gebruikers. Spreek je gedachte uit,
              krijg direct tekst. In elke app op je Mac of Windows.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold tracking-tight text-[color:var(--navy)]">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[color:var(--border-soft)] pt-8 text-sm text-[color:var(--text-muted)] md:flex-row md:items-center">
          <p>&copy; {year} Dicteren.ai. Alle rechten voorbehouden.</p>
          <div className="flex flex-wrap items-center gap-4">
            <CookiePreferencesButton className="underline hover:text-[color:var(--navy)]">
              Cookie-voorkeuren wijzigen
            </CookiePreferencesButton>
            <p>Gemaakt in Nederland. Lokaal verwerkt.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
