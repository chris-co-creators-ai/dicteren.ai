// Dicteren.ai — Affiliate slug-helpers
//
// Affiliates krijgen een persoonlijke URL: dicteren.ai/{slug}
//
// Slug-regels:
//   - lowercase letters, cijfers, dashes
//   - 3-40 chars
//   - geen leading/trailing dash
//   - niet in RESERVED_SLUGS (anders botst het met system-routes)
//
// Catch-all route: app/[slug]/page.tsx (zie Fase C).

import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates, type Affiliate } from "@/lib/db/schema";

/** Top-level routes die nooit als affiliate-slug mogen worden gekozen.
 *  Houd deze synchroon met de bestaande Next.js routes. */
export const RESERVED_SLUGS = new Set<string>([
  // System
  "api",
  "auth",
  "admin",
  "account",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  // Marketing
  "",
  "ai-model",
  "blog",
  "contact",
  "download",
  "help",
  "over-ons",
  "prijzen",
  "privacy",
  "product",
  "veelgestelde-vragen",
  "voor-wie",
  "voorwaarden",
  "word-partner",
  "zakelijk",
  // App
  "affiliate",
  "checkout",
  "trial",
  // Future-proofing
  "r",
  "partner",
  "ref",
  "dashboard",
  "billing",
  "settings",
  "support",
  "login",
  "logout",
  "signup",
  "signin",
  "sign-in",
  "sign-up",
  "logo",
  "email",
  "assets",
  "public",
  "static",
]);

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/;

export type SlugValidation =
  | { ok: true; slug: string }
  | { ok: false; error: string; code: "INVALID_FORMAT" | "RESERVED" | "TAKEN" };

/** Format-check + reserved-check (geen DB-call). */
export function validateSlugFormat(input: string): SlugValidation {
  const trimmed = input.trim().toLowerCase();
  if (!SLUG_REGEX.test(trimmed)) {
    return {
      ok: false,
      code: "INVALID_FORMAT",
      error:
        "Gebruik 3-40 lowercase letters, cijfers en dashes. Geen leading/trailing dash.",
    };
  }
  if (RESERVED_SLUGS.has(trimmed)) {
    return {
      ok: false,
      code: "RESERVED",
      error: "Deze slug is gereserveerd voor systeem-routes.",
    };
  }
  return { ok: true, slug: trimmed };
}

/** Volledige check (format + reserved + DB-collision). */
export async function validateSlugAvailable(
  input: string,
  excludeAffiliateId?: string,
): Promise<SlugValidation> {
  const format = validateSlugFormat(input);
  if (!format.ok) return format;

  const [existing] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(eq(affiliates.slug, format.slug))
    .limit(1);
  if (existing && existing.id !== excludeAffiliateId) {
    return {
      ok: false,
      code: "TAKEN",
      error: "Deze slug is al in gebruik door een andere partner.",
    };
  }
  return { ok: true, slug: format.slug };
}

/** Lookup affiliate by slug. Returns null bij niet bestaan of niet actief. */
export async function getAffiliateBySlug(
  slug: string,
): Promise<Affiliate | null> {
  const format = validateSlugFormat(slug);
  if (!format.ok) return null;
  const [row] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.slug, format.slug))
    .limit(1);
  return row ?? null;
}

/** Slug-suggesties op basis van naam. Voor admin: geeft 3 opties. */
export function suggestSlugFromName(name: string): string[] {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  if (!base || base.length < 3) return [];

  const out: string[] = [];
  if (!RESERVED_SLUGS.has(base)) out.push(base);
  // Voeg variant met dit jaar als tweede optie
  const withYear = `${base}-${new Date().getFullYear()}`.slice(0, 40);
  if (!RESERVED_SLUGS.has(withYear) && withYear !== base) out.push(withYear);
  // Voeg random suffix als derde
  const rand = Math.random().toString(36).slice(2, 6);
  out.push(`${base}-${rand}`.slice(0, 40));
  return out;
}

/** Counter voor admin: hoeveel actieve slugs zijn er nu? */
export async function countActiveSlugs(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(affiliates)
    .where(sql`${affiliates.slug} IS NOT NULL AND ${affiliates.status} = 'active'`);
  return count;
}
