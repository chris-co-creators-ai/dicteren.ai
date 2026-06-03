import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { getFaqArticles } from "@/lib/content/kennisbank";

export const metadata = { title: "Veelgestelde vragen" };

// Geen eigen lijst meer: de FAQ leest de featured-artikelen uit de kennisbank
// (de plek van waarheid). Antwoorden linken door naar het volledige artikel.
export default function FaqPage() {
  const faqs = getFaqArticles();

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <span className="chip">FAQ</span>
        <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl">
          Veelgestelde vragen
        </h1>
        <p className="mt-4 text-base text-[color:var(--text-muted)] sm:text-lg">
          De vragen die we het vaakst horen. Meer weten? Bekijk de{" "}
          <Link
            href="/kennisbank"
            className="font-semibold text-[color:var(--navy-500)] underline-offset-4 hover:underline"
          >
            volledige kennisbank
          </Link>
          .
        </p>

        <div className="mt-9">
          {faqs.map((f, i) => (
            <details
              key={f.href}
              open={i === 0}
              className="border-t border-[color:var(--border-soft)] py-4 [&_summary::-webkit-details-marker]:hidden [&[open]_summary_svg]:rotate-45"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 text-[15px] font-semibold sm:text-base">
                <Plus
                  className="size-4 shrink-0 translate-y-0.5 transition-transform"
                  strokeWidth={2.4}
                  style={{ color: "var(--orange)" }}
                />
                {f.article.title}
              </summary>
              <div className="mt-2.5 pl-7 text-[15px] leading-relaxed text-[color:var(--text-muted)]">
                <p>{f.article.summary}</p>
                <Link
                  href={f.href}
                  className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[color:var(--navy)] hover:underline"
                >
                  Lees het hele antwoord
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
