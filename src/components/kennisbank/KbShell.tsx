import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { categories, articleHref, categoryHref } from "@/lib/content/kennisbank";

export type Crumb = { label: string; href?: string };

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-1.5 text-[13px] text-[color:var(--text-muted)]">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 opacity-60" />}
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-[color:var(--navy)] hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "font-semibold text-[color:var(--navy)]" : ""}>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function IndexTree({
  activeCategory,
  activeArticle,
}: {
  activeCategory?: string;
  activeArticle?: string;
}) {
  return (
    <nav aria-label="Onderwerpen" className="space-y-1">
      {categories.map((c) => {
        const open = c.slug === activeCategory;
        return (
          <details key={c.slug} open={open} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-semibold text-[color:var(--navy)] hover:bg-white [&::-webkit-details-marker]:hidden">
              <Link href={categoryHref(c.slug)} className="hover:underline">
                {c.title}
              </Link>
              <ChevronRight className="size-4 shrink-0 opacity-50 transition-transform group-open:rotate-90" />
            </summary>
            <ul className="mb-1 ml-3 border-l border-[color:var(--border-soft)] pl-2">
              {c.articles.map((a) => {
                const isActive = c.slug === activeCategory && a.slug === activeArticle;
                return (
                  <li key={a.slug}>
                    <Link
                      href={articleHref(c.slug, a.slug)}
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-[14px] leading-snug ${
                        isActive
                          ? "bg-white font-semibold text-[color:var(--navy)]"
                          : "text-[color:var(--text-muted)] hover:bg-white hover:text-[color:var(--navy)]"
                      }`}
                    >
                      {a.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}

export function KbShell({
  crumbs,
  activeCategory,
  activeArticle,
  children,
}: {
  crumbs: Crumb[];
  activeCategory?: string;
  activeArticle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Breadcrumbs crumbs={crumbs} />

      <div className="mt-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
        {/* Mobiel: ingeklapte index achter een knop */}
        <details className="mb-6 rounded-xl bg-[color:var(--bg-soft,#f6f7f9)] p-2 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-[15px] font-semibold text-[color:var(--navy)] [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" strokeWidth={2.2} />
            Onderwerpen
          </summary>
          <div className="mt-2">
            <IndexTree activeCategory={activeCategory} activeArticle={activeArticle} />
          </div>
        </details>

        {/* Desktop: index altijd zichtbaar, blijft meescrollen */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl bg-[color:var(--bg-soft,#f6f7f9)] p-2">
            <IndexTree activeCategory={activeCategory} activeArticle={activeArticle} />
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
