import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { categories, categoryHref, getSearchIndex } from "@/lib/content/kennisbank";
import { KbSearch } from "@/components/kennisbank/KbSearch";

export const metadata = {
  title: "Kennisbank, alle uitleg in gewone taal",
  description:
    "Alles over Dicteren.ai uitgelegd in eenvoudige taal. Met plaatjes van het programma erbij, zodat je precies weet wat je doet.",
};

export default function KennisbankPage() {
  const searchItems = getSearchIndex();

  return (
    <>
      <section className="px-4 pt-14 text-center sm:px-6 sm:pt-20 lg:px-14">
        <span className="chip">Kennisbank</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Alle vragen die je kan hebben. In gewone taal.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Geen technisch verhaal, geen moeilijke woorden. Met plaatjes van het
          programma erbij, zodat je ziet wat je ziet als je het zelf doet.
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <KbSearch items={searchItems} />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-14">
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={categoryHref(c.slug)}
              className="group flex flex-col rounded-2xl border border-[color:var(--border)] bg-white p-5 transition-colors hover:border-[color:var(--navy)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--navy)" }}
                >
                  {c.number}
                </span>
                <h2 className="text-[17px] font-bold leading-tight text-[color:var(--navy)]">
                  {c.title}
                </h2>
              </div>
              {c.intro && (
                <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-[color:var(--text-muted)]">
                  {c.intro}
                </p>
              )}
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--navy)]">
                {c.articles.length} {c.articles.length === 1 ? "onderwerp" : "onderwerpen"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 rounded-2xl bg-[color:var(--navy)] px-6 py-10 text-center text-white">
          <MessageCircle className="size-7" strokeWidth={2} />
          <h2 className="text-xl font-bold">Staat je vraag er niet bij?</h2>
          <p className="max-w-md text-[15px] text-white/80">
            Mail ons gerust. Echte mensen, meestal antwoord binnen één werkdag.
          </p>
          <Link
            href="/contact"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[color:var(--orange)] px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90"
          >
            Neem contact op
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
