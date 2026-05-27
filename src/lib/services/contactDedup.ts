// Dicteren.ai — Cross-table contact-dedup
//
// Centrale dedup-service voor alle entity-creates. Queryt unified_contacts_v
// (live VIEW over 5 bron-tabellen) op exacte email, exacte KvK en fuzzy naam
// (Levenshtein ≤ 2). Returnt matches met source + display + ownerInfo zodat
// de UI een popup kan tonen.
//
// Gebruik (server-only):
//   const matches = await findContactMatches({ email, kvk, name });
//   if (matches.some(m => m.matchType === 'exact_email')) return 409;

import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type ContactMatchType =
  | "exact_email"
  | "exact_kvk"
  | "fuzzy_name";

export type ContactMatchSource =
  | "user"
  | "crm_contact"
  | "crm_org"
  | "partner"
  | "affiliate";

export type ContactMatch = {
  entityId: string;
  source: ContactMatchSource;
  emailNorm: string | null;
  displayName: string | null;
  kvk: string | null;
  ownerUserId: string | null;
  matchType: ContactMatchType;
  matchScore: number;
};

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normName(name: string): string {
  return name.trim().toLowerCase();
}

export async function findContactMatches(args: {
  email?: string | null;
  kvk?: string | null;
  name?: string | null;
  /** Levenshtein-max-afstand voor fuzzy-name. Default 2. */
  fuzzyMax?: number;
}): Promise<ContactMatch[]> {
  const matches: ContactMatch[] = [];
  const fuzzyMax = args.fuzzyMax ?? 2;

  // 1. Exacte email-match over alle bronnen
  if (args.email && args.email.trim()) {
    const emailNorm = normEmail(args.email);
    const rows = await db.execute<{
      entity_id: string;
      source: ContactMatchSource;
      email_norm: string | null;
      display_name: string | null;
      kvk: string | null;
      owner_user_id: string | null;
    }>(
      sql`
        SELECT entity_id, source, email_norm, display_name, kvk, owner_user_id
        FROM public.unified_contacts_v
        WHERE email_norm = ${emailNorm}
      `,
    );
    for (const r of rows.rows ?? []) {
      matches.push({
        entityId: r.entity_id,
        source: r.source,
        emailNorm: r.email_norm,
        displayName: r.display_name,
        kvk: r.kvk,
        ownerUserId: r.owner_user_id,
        matchType: "exact_email",
        matchScore: 1.0,
      });
    }
  }

  // 2. Exacte KvK-match (alleen crm_org en partner met KvK)
  if (args.kvk && args.kvk.trim()) {
    const kvkTrim = args.kvk.trim();
    const rows = await db.execute<{
      entity_id: string;
      source: ContactMatchSource;
      email_norm: string | null;
      display_name: string | null;
      kvk: string | null;
      owner_user_id: string | null;
    }>(
      sql`
        SELECT entity_id, source, email_norm, display_name, kvk, owner_user_id
        FROM public.unified_contacts_v
        WHERE kvk = ${kvkTrim}
      `,
    );
    for (const r of rows.rows ?? []) {
      matches.push({
        entityId: r.entity_id,
        source: r.source,
        emailNorm: r.email_norm,
        displayName: r.display_name,
        kvk: r.kvk,
        ownerUserId: r.owner_user_id,
        matchType: "exact_kvk",
        matchScore: 1.0,
      });
    }
  }

  // 3. Fuzzy naam-match (Levenshtein) op crm_org + partner + crm_contact + affiliate
  if (args.name && args.name.trim().length >= 3) {
    const nameLow = normName(args.name);
    const rows = await db.execute<{
      entity_id: string;
      source: ContactMatchSource;
      email_norm: string | null;
      display_name: string | null;
      kvk: string | null;
      owner_user_id: string | null;
      distance: number;
    }>(
      sql`
        SELECT entity_id, source, email_norm, display_name, kvk, owner_user_id,
               levenshtein(lower(trim(display_name)), ${nameLow}) AS distance
        FROM public.unified_contacts_v
        WHERE display_name IS NOT NULL
          AND length(display_name) BETWEEN ${nameLow.length - fuzzyMax} AND ${nameLow.length + fuzzyMax}
          AND levenshtein(lower(trim(display_name)), ${nameLow}) <= ${fuzzyMax}
      `,
    );
    for (const r of rows.rows ?? []) {
      const distance = Number(r.distance);
      // Skip exact-name hits — die zijn al door email/kvk gevangen of zijn echte gelijken
      const score = 1 - distance / Math.max(nameLow.length, 1);
      matches.push({
        entityId: r.entity_id,
        source: r.source,
        emailNorm: r.email_norm,
        displayName: r.display_name,
        kvk: r.kvk,
        ownerUserId: r.owner_user_id,
        matchType: "fuzzy_name",
        matchScore: Math.round(score * 100) / 100,
      });
    }
  }

  // Dedup: zelfde entity_id+source kan via meerdere matchTypes komen. Hou hoogste score.
  const byKey = new Map<string, ContactMatch>();
  for (const m of matches) {
    const k = `${m.source}:${m.entityId}`;
    const prev = byKey.get(k);
    if (!prev || m.matchScore > prev.matchScore) byKey.set(k, m);
  }
  return Array.from(byKey.values()).sort((a, b) => b.matchScore - a.matchScore);
}

export type DedupCheckResult =
  | { ok: true; matches: [] }
  | { ok: false; reason: "exact_match"; matches: ContactMatch[] }
  | { ok: true; reason: "fuzzy_only"; matches: ContactMatch[] };

/**
 * Hard-check: returnt { ok: false } als er een exacte (email of kvk) match is.
 * Fuzzy-only matches blokkeren niet, alleen waarschuwen.
 */
export async function checkDedupBeforeCreate(args: {
  email?: string | null;
  kvk?: string | null;
  name?: string | null;
}): Promise<DedupCheckResult> {
  const matches = await findContactMatches(args);
  if (matches.length === 0) return { ok: true, matches: [] };
  const hasExact = matches.some(
    (m) => m.matchType === "exact_email" || m.matchType === "exact_kvk",
  );
  if (hasExact) {
    return {
      ok: false,
      reason: "exact_match",
      matches: matches.filter(
        (m) => m.matchType === "exact_email" || m.matchType === "exact_kvk",
      ),
    };
  }
  return { ok: true, reason: "fuzzy_only", matches };
}
