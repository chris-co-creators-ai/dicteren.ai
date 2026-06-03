import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  visibleCategories,
  categoryHref,
  getSearchIndex,
  KB_ACCOUNT_BASE,
} from "@/lib/content/kennisbank";
import { KbSearch } from "@/components/kennisbank/KbSearch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hulp · Dicteren.ai" };

export default function AccountHulpPage() {
  const categories = visibleCategories("account");
  const searchItems = getSearchIndex("account");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[color:var(--navy)]">
        Hulp
      </h1>
      <p className="mt-2 text-[15px] text-[color:var(--text-muted)]">
        Antwoorden op je vragen, met je eigen gegevens erbij. Zoek of kies een
        onderwerp.
      </p>

      <div className="mt-6">
        <KbSearch items={searchItems} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={categoryHref(c.slug, KB_ACCOUNT_BASE)}
            className="group flex flex-col rounded-2xl border border-[color:var(--border)] bg-white p-5 transition-colors hover:border-[color:var(--navy)]"
          >
            <h2 className="text-[17px] font-bold leading-tight text-[color:var(--navy)]">
              {c.title}
            </h2>
            {c.intro && (
              <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[color:var(--text-muted)]">
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
    </div>
  );
}
