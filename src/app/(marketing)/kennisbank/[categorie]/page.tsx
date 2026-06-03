import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  categories,
  getCategory,
  articleHref,
  KB_BASE,
} from "@/lib/content/kennisbank";
import { KbShell } from "@/components/kennisbank/KbShell";

type Params = Promise<{ categorie: string }>;

export function generateStaticParams() {
  return categories.map((c) => ({ categorie: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { categorie } = await params;
  const category = getCategory(categorie);
  if (!category) return { title: "Niet gevonden · Dicteren.ai" };
  return {
    title: `${category.title} · Kennisbank`,
    description: category.intro,
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { categorie } = await params;
  const category = getCategory(categorie);
  if (!category) notFound();

  return (
    <KbShell
      crumbs={[{ label: "Kennisbank", href: KB_BASE }, { label: category.title }]}
      activeCategory={category.slug}
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--navy)]">
          {category.title}
        </h1>
        {category.intro && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[color:var(--text-muted)]">
            {category.intro}
          </p>
        )}
      </header>

      <ul className="mt-8 space-y-2.5">
        {category.articles.map((a) => (
          <li key={a.slug}>
            <Link
              href={articleHref(category.slug, a.slug)}
              className="group flex items-start justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-white p-4 transition-colors hover:border-[color:var(--navy)]"
            >
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold text-[color:var(--navy)]">
                  {a.title}
                </span>
                <span className="mt-1 block text-[14px] leading-relaxed text-[color:var(--text-muted)]">
                  {a.summary}
                </span>
              </span>
              <ArrowRight className="mt-1 size-5 shrink-0 text-[color:var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--navy)]" />
            </Link>
          </li>
        ))}
      </ul>
    </KbShell>
  );
}
