import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  getArticle,
  getAdjacent,
  articleVisibleInScope,
  categoryHref,
  KB_ACCOUNT_BASE,
} from "@/lib/content/kennisbank";
import { KbShell } from "@/components/kennisbank/KbShell";
import { KbInteractiveBlock } from "@/components/account/kb/KbInteractiveBlock";

export const dynamic = "force-dynamic";

type Params = Promise<{ categorie: string; artikel: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { categorie, artikel } = await params;
  const found = getArticle(categorie, artikel);
  if (!found) return { title: "Niet gevonden · Dicteren.ai" };
  return { title: `${found.article.title} · Hulp` };
}

export default async function AccountArticlePage({ params }: { params: Params }) {
  const session = (await getSession())!;
  const { categorie, artikel } = await params;
  const found = getArticle(categorie, artikel);
  if (!found || !articleVisibleInScope(categorie, artikel, "account")) notFound();

  const { category, article } = found;
  const { prev, next } = getAdjacent(categorie, artikel, "account");

  return (
    <KbShell
      scope="account"
      basePath={KB_ACCOUNT_BASE}
      crumbs={[
        { label: "Hulp", href: KB_ACCOUNT_BASE },
        { label: category.title, href: categoryHref(category.slug, KB_ACCOUNT_BASE) },
        { label: article.title },
      ]}
      activeCategory={category.slug}
      activeArticle={article.slug}
    >
      <article>
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--navy)]">
          {article.title}
        </h1>
        <div className="mt-5 space-y-3 text-[16px] leading-relaxed text-[color:var(--text)]">
          {article.body}
        </div>
        {article.interactive && (
          <KbInteractiveBlock type={article.interactive} userId={session.user.id} />
        )}
      </article>

      <nav className="mt-12 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={prev.href}
            className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 hover:border-[color:var(--navy)]"
          >
            <ArrowLeft className="size-5 shrink-0 text-[color:var(--text-muted)] group-hover:text-[color:var(--navy)]" />
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-wide text-[color:var(--text-muted)]">
                Vorige
              </span>
              <span className="block truncate text-[14px] font-semibold text-[color:var(--navy)]">
                {prev.article.title}
              </span>
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={next.href}
            className="group flex items-center justify-end gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 text-right hover:border-[color:var(--navy)]"
          >
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-wide text-[color:var(--text-muted)]">
                Volgende
              </span>
              <span className="block truncate text-[14px] font-semibold text-[color:var(--navy)]">
                {next.article.title}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-[color:var(--text-muted)] group-hover:text-[color:var(--navy)]" />
          </Link>
        )}
      </nav>

      <div className="mt-8 flex flex-col items-start gap-2 rounded-xl bg-[color:var(--bg-soft,#f6f7f9)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--navy)]">
          <MessageCircle className="size-5" strokeWidth={2} />
          Kom je er niet uit?
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--orange)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90"
        >
          Neem contact op
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </KbShell>
  );
}
