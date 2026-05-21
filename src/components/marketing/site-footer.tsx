import Link from "next/link";
import { Logo } from "@/components/shared/logo";

type FooterColumn = {
  title: string;
  links: { label: string; href: string }[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "AI-tools", href: "/product/ai-tools" },
      { label: "Lokaal dicteren", href: "/product/lokaal-dicteren" },
      { label: "Privacy", href: "/product/privacy" },
      { label: "Voor Mac", href: "/product/mac" },
      { label: "Voor Windows", href: "/product/windows" },
      { label: "Nederlands dicteren", href: "/product/nederlands-dicteren" },
      { label: "Toetsenbord-stickers", href: "/product/toetsenbord-stickers" },
    ],
  },
  {
    title: "Voor wie",
    links: [
      { label: "Ondernemers", href: "/voor-wie/ondernemers" },
      { label: "Advocaten", href: "/voor-wie/advocaten" },
      { label: "Zorgprofessionals", href: "/voor-wie/zorgprofessionals" },
      { label: "Coaches & therapeuten", href: "/voor-wie/coaches-therapeuten" },
      { label: "Accountants & admin", href: "/voor-wie/accountants-administratie" },
      { label: "Makelaars", href: "/voor-wie/makelaars" },
      { label: "Recruiters & HR", href: "/voor-wie/recruiters-hr" },
      { label: "Studenten & onderzoekers", href: "/voor-wie/studenten-onderzoekers" },
      { label: "Schrijvers", href: "/voor-wie/schrijvers-contentmakers" },
      { label: "Dyslexie", href: "/voor-wie/dyslexie" },
    ],
  },
  {
    title: "Zakelijk",
    links: [
      { label: "Overzicht", href: "/zakelijk" },
      { label: "Teams", href: "/zakelijk/teams" },
      { label: "Organisaties", href: "/zakelijk/organisaties" },
      { label: "Licenties", href: "/zakelijk/licenties" },
      { label: "Privacy & security", href: "/zakelijk/privacy-security" },
      { label: "Facturatie", href: "/zakelijk/facturatie" },
      { label: "Affiliate partners", href: "/zakelijk/affiliate-partners" },
    ],
  },
  {
    title: "Support & meer",
    links: [
      { label: "Help", href: "/help" },
      { label: "Veelgestelde vragen", href: "/veelgestelde-vragen" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/blog" },
      { label: "Over ons", href: "/over-ons" },
      { label: "Privacy", href: "/privacy" },
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
          <p>Gemaakt in Nederland. Lokaal verwerkt.</p>
        </div>
      </div>
    </footer>
  );
}
