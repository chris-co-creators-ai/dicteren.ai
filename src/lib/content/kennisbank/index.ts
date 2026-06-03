import { categories } from "./content";
import type { KbArticle, KbAudience, KbCategory, KbSearchItem } from "./types";

export { categories };
export type { KbArticle, KbAudience, KbCategory, KbSearchItem };

export const KB_BASE = "/kennisbank";
export const KB_ACCOUNT_BASE = "/account/hulp";

// Scope bepaalt welke artikelen zichtbaar zijn:
//  - public:  bezoeker op /kennisbank — geen account-content, nooit user-data.
//  - account: ingelogde klant in het dashboard — eigen how-to's, server-side verrijkt.
export type KbScope = "public" | "account";

function inScope(article: KbArticle, scope: KbScope): boolean {
  if (article.audience === "both") return true;
  return scope === "public"
    ? article.audience === "visitor"
    : article.audience === "customer";
}

export function basePathFor(scope: KbScope): string {
  return scope === "public" ? KB_BASE : KB_ACCOUNT_BASE;
}

export function articleHref(
  categorySlug: string,
  articleSlug: string,
  base: string = KB_BASE,
): string {
  return `${base}/${categorySlug}/${articleSlug}`;
}

export function categoryHref(
  categorySlug: string,
  base: string = KB_BASE,
): string {
  return `${base}/${categorySlug}`;
}

export function getCategory(slug: string): KbCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getArticle(
  categorySlug: string,
  articleSlug: string,
): { category: KbCategory; article: KbArticle } | undefined {
  const category = getCategory(categorySlug);
  const article = category?.articles.find((a) => a.slug === articleSlug);
  if (!category || !article) return undefined;
  return { category, article };
}

// Categorieën met hun artikelen gefilterd op scope. Lege categorieën vallen weg.
export function visibleCategories(scope: KbScope): KbCategory[] {
  return categories
    .map((c) => ({ ...c, articles: c.articles.filter((a) => inScope(a, scope)) }))
    .filter((c) => c.articles.length > 0);
}

export function articleVisibleInScope(
  categorySlug: string,
  articleSlug: string,
  scope: KbScope,
): boolean {
  const found = getArticle(categorySlug, articleSlug);
  return !!found && inScope(found.article, scope);
}

type FlatArticle = {
  category: KbCategory;
  article: KbArticle;
  href: string;
};

// Vlakke leesvolgorde binnen een scope — basis voor vorige/volgende.
export function flatArticles(scope: KbScope): FlatArticle[] {
  const base = basePathFor(scope);
  return visibleCategories(scope).flatMap((category) =>
    category.articles.map((article) => ({
      category,
      article,
      href: articleHref(category.slug, article.slug, base),
    })),
  );
}

export function getAdjacent(
  categorySlug: string,
  articleSlug: string,
  scope: KbScope,
): { prev?: FlatArticle; next?: FlatArticle } {
  const flat = flatArticles(scope);
  const i = flat.findIndex(
    (f) => f.category.slug === categorySlug && f.article.slug === articleSlug,
  );
  if (i === -1) return {};
  return { prev: flat[i - 1], next: flat[i + 1] };
}

// FAQ-view: de featured-artikelen, publieke audience (visitor/both).
export function getFaqArticles(): FlatArticle[] {
  return flatArticles("public").filter((f) => f.article.faq);
}

// Lichtgewicht index voor client-side zoeken — geen JSX, veilig naar de browser.
export function getSearchIndex(scope: KbScope): KbSearchItem[] {
  return flatArticles(scope).map((f) => ({
    title: f.article.title,
    summary: f.article.summary,
    category: f.category.title,
    href: f.href,
  }));
}

// Static params voor de publieke routes (account-routes zijn auth-gated, dynamic).
export function categoryParams(scope: KbScope): { categorie: string }[] {
  return visibleCategories(scope).map((c) => ({ categorie: c.slug }));
}

export function articleParams(
  scope: KbScope,
): { categorie: string; artikel: string }[] {
  return flatArticles(scope).map((f) => ({
    categorie: f.category.slug,
    artikel: f.article.slug,
  }));
}
