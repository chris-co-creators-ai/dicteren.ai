import { categories } from "./content";
import type { KbArticle, KbAudience, KbCategory, KbSearchItem } from "./types";

export { categories };
export type { KbArticle, KbAudience, KbCategory, KbSearchItem };

export const KB_BASE = "/kennisbank";

export function articleHref(categorySlug: string, articleSlug: string): string {
  return `${KB_BASE}/${categorySlug}/${articleSlug}`;
}

export function categoryHref(categorySlug: string): string {
  return `${KB_BASE}/${categorySlug}`;
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

type FlatArticle = {
  category: KbCategory;
  article: KbArticle;
  href: string;
};

// Vlakke leesvolgorde over alle categorieën heen — basis voor vorige/volgende.
export function flatArticles(): FlatArticle[] {
  return categories.flatMap((category) =>
    category.articles.map((article) => ({
      category,
      article,
      href: articleHref(category.slug, article.slug),
    })),
  );
}

export function getAdjacent(
  categorySlug: string,
  articleSlug: string,
): { prev?: FlatArticle; next?: FlatArticle } {
  const flat = flatArticles();
  const i = flat.findIndex(
    (f) => f.category.slug === categorySlug && f.article.slug === articleSlug,
  );
  if (i === -1) return {};
  return { prev: flat[i - 1], next: flat[i + 1] };
}

// FAQ-view leest de artikelen die als faq gemarkeerd zijn (audience visitor/both).
export function getFaqArticles(): FlatArticle[] {
  return flatArticles().filter(
    (f) => f.article.faq && f.article.audience !== "customer",
  );
}

// Account-dashboard toont de klant-relevante artikelen (customer + both).
export function getAccountArticles(): FlatArticle[] {
  return flatArticles().filter((f) => f.article.audience !== "visitor");
}

// Lichtgewicht index voor client-side zoeken — geen JSX, veilig naar de browser.
export function getSearchIndex(): KbSearchItem[] {
  return flatArticles().map((f) => ({
    title: f.article.title,
    summary: f.article.summary,
    category: f.category.title,
    href: f.href,
  }));
}

export function articleParams(): { categorie: string; artikel: string }[] {
  return flatArticles().map((f) => ({
    categorie: f.category.slug,
    artikel: f.article.slug,
  }));
}
