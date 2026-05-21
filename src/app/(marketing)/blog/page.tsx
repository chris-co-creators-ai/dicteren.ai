import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Blog" };

const CLUSTERS = [
  { slug: "dicteren", label: "Dicteren", desc: "Werkwijzen, tips en flow." },
  { slug: "productiviteit", label: "Productiviteit", desc: "Sneller schrijven, beter denken." },
  { slug: "privacy-ai", label: "Privacy & AI", desc: "Lokaal verwerken, wat dat betekent." },
  { slug: "nederlandse-taal", label: "Nederlandse taal", desc: "Accenten, dialecten, jargon." },
  { slug: "zakelijk-dicteren", label: "Zakelijk dicteren", desc: "Teams, organisaties, processen." },
  { slug: "toegankelijkheid", label: "Toegankelijkheid", desc: "Dyslexie, RSI, reuma, motoriek." },
];

export default function BlogIndexPage() {
  return (
    <>
      <section className="px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-14">
        <span className="chip">Blog</span>
        <h1 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Schrijven, dicteren en de Nederlandse manier van werken.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Eerste artikelen verschijnen rond de publieke launch. Tot die tijd
          een overzicht van de thema's waarover we gaan schrijven.
        </p>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLUSTERS.map((c) => (
            <Link
              key={c.slug}
              href={`/blog/${c.slug}`}
              className="brand-card group block p-5 transition-transform hover:-translate-y-0.5"
            >
              <div
                className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em]"
                style={{ color: "var(--orange)" }}
              >
                Thema
              </div>
              <h3 className="mt-2 text-lg font-bold">{c.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-muted)]">
                {c.desc}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--navy-500)] group-hover:text-[color:var(--navy)]">
                Bekijk thema
                <ArrowRight className="size-3" strokeWidth={2.2} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
