// Dicteren.ai — Table-based rate-limit per (bucketKey, key-hash).
//
// Werkt multi-instance op Vercel (Upstash/Redis is overhead voor lage volumes).
// Bewust DB-based: één SELECT + één INSERT per check. Bij hoge volumes
// (> 10K req/dag op publieke endpoints) migreer naar Upstash Redis — zie
// .claude/skills/rate-limit.md voor de drempel-discussie.
//
// Keys worden SHA-256-gehashed met salt (GDPR: geen raw-IP / raw-user-id
// opslag in events-tabel). pruneRateLimitEvents() ruimt op via daily cron.

import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEvents } from "@/lib/db/schema";

const SALT = process.env.RATE_LIMIT_SALT ?? "dicteren-ratelimit-v1";

/** Named bucket = endpoint + scope. Central register zodat limits niet
 *  per route uit het lood gaan. Wijziging hier raakt alle call-sites. */
export const RATE_LIMITS = {
  // Publieke forms: anti-bot, niet anti-user. 5/10min ruim genoeg voor
  // een echte gebruiker, te krap voor scripted submits.
  "contact:general": { limit: 5, windowSeconds: 600 },
  "contact:sales": { limit: 5, windowSeconds: 600 },
  "contact:support": { limit: 5, windowSeconds: 600 },
  "contact:partnership": { limit: 5, windowSeconds: 600 },
  "contact:quote_request": { limit: 5, windowSeconds: 600 },
  partnership: { limit: 3, windowSeconds: 600 },

  // Brute-force op licentiecode. 28^N is groot maar niet astronomisch,
  // dus strikt: 10 pogingen / 10 minuten / IP. Een legitiem retry-scenario
  // van een gebruiker die zijn code verkeerd typt past hier ruim binnen.
  "license:activate": { limit: 10, windowSeconds: 600 },

  // Trial-claim is server-side al 1-per-user dedupe (account_id). Hier
  // tegen mass-account-creation-spam: 3 claims / dag / IP voorkomt dat
  // één IP duizenden accounts aanmaakt om trial-codes te oogsten.
  "license:trial": { limit: 3, windowSeconds: 86_400 },

  // Status-check is Tauri's daily heartbeat. Ruim limit per device-token
  // zodat legitiem polling-gedrag (1× per dag) royaal past, maar een
  // gecompromitteerd token niet eindeloos kan hammeren.
  "license:status": { limit: 60, windowSeconds: 600 },

  // Checkout: voorkomt het aanmaken van honderden pending Mollie-orders
  // (geld kost niets maar pollutes dashboard + admin). 10/min/user is
  // ruim voor "ik klik per ongeluk dubbel".
  "checkout:consumer": { limit: 10, windowSeconds: 60 },
  "checkout:organization": { limit: 10, windowSeconds: 60 },

  // Cancel-spam beperken — Mollie DELETE is goedkope op API maar log-noise
  // in audit-feed bij abuse.
  "subscription:cancel": { limit: 5, windowSeconds: 60 },

  // Seat-management — anti-spam. Owner kan in theorie veel klikken;
  // hard cap zodat ze niet per ongeluk 50 invites versturen.
  "org:seat_preview": { limit: 30, windowSeconds: 60 },
  "org:seat_upgrade": { limit: 5, windowSeconds: 60 },
  "org:seat_downgrade": { limit: 5, windowSeconds: 60 },
  "org:seat_assign": { limit: 20, windowSeconds: 60 },
  "org:seat_revoke": { limit: 20, windowSeconds: 60 },
  "org:seat_reassign": { limit: 10, windowSeconds: 60 },
  "org:invite": { limit: 30, windowSeconds: 600 },
  "org:invite_resend": { limit: 10, windowSeconds: 600 },
} as const satisfies Record<string, { limit: number; windowSeconds: number }>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export function hashIp(ip: string | null | undefined): string {
  const raw = (ip ?? "unknown").trim();
  return createHash("sha256").update(SALT + raw).digest("hex").slice(0, 32);
}

/** Generic hash voor non-IP keys (userId, token-fingerprint). */
function hashKey(key: string): string {
  return createHash("sha256").update(SALT + key).digest("hex").slice(0, 32);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  return "unknown";
}

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; resetInSeconds: number };

/** Low-level check + record. Caller bepaalt zelf bucketKey en window. */
export async function checkRateLimit(args: {
  bucketKey: string;
  ipHash: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const since = new Date(Date.now() - args.windowSeconds * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.bucketKey, args.bucketKey),
        eq(rateLimitEvents.ipHash, args.ipHash),
        gte(rateLimitEvents.createdAt, since),
      ),
    );

  if (count >= args.limit) {
    return { allowed: false, resetInSeconds: args.windowSeconds };
  }

  await db.insert(rateLimitEvents).values({
    bucketKey: args.bucketKey,
    ipHash: args.ipHash,
  });

  return { allowed: true, remaining: args.limit - count - 1 };
}

type EnforceOptions = {
  /** Custom key (userId, token-fingerprint). Standaard: IP uit request. */
  key?: string;
  /** Voor 429 response: locale message (mag null voor default NL). */
  message?: string;
};

/**
 * High-level helper: roep dit aan in een route-handler. Returnt:
 *  - null  → mag door, ga verder met de handler
 *  - NextResponse 429 → return deze direct
 *
 * Gebruik:
 * ```ts
 * const blocked = await enforceRateLimit(request, "license:activate");
 * if (blocked) return blocked;
 * ```
 */
export async function enforceRateLimit(
  request: Request,
  bucket: RateLimitBucket,
  options?: EnforceOptions,
): Promise<NextResponse | null> {
  const cfg = RATE_LIMITS[bucket];
  const rawKey = options?.key ?? getClientIp(request);
  const ipHash = options?.key ? hashKey(rawKey) : hashIp(rawKey);

  const result = await checkRateLimit({
    bucketKey: bucket,
    ipHash,
    limit: cfg.limit,
    windowSeconds: cfg.windowSeconds,
  });

  if (result.allowed) return null;

  return NextResponse.json(
    {
      success: false,
      error:
        options?.message ??
        "Te veel verzoeken. Probeer over een paar minuten opnieuw.",
      retryAfter: result.resetInSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.resetInSeconds) },
    },
  );
}

/** Verwijdert events ouder dan window-grootte. Aangeroepen door
 *  /api/cron/prune-rate-limit/route.ts (vercel.json cron-schedule). */
export async function pruneRateLimitEvents(
  olderThanSeconds = 86_400,
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - olderThanSeconds * 1000);
  const result = await db
    .delete(rateLimitEvents)
    .where(lt(rateLimitEvents.createdAt, cutoff));
  // neon-http returnt geen rowCount, dus we tellen via count vooraf
  // wanneer dat belangrijk is. Voor cron volstaat success-bool.
  return { deleted: result.rowCount ?? 0 };
}
