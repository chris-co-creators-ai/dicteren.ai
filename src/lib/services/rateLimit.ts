// Dicteren.ai — Table-based rate-limit per (bucketKey, ipHash).
//
// Werkt multi-instance op Vercel (Upstash/Redis is overhead voor lage volumes).
// Voor publieke contact-forms: ~5 requests / 10 min per IP is genoeg
// om botspam af te knijpen zonder echte gebruikers te frustreren.

import "server-only";
import { createHash } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEvents } from "@/lib/db/schema";

const SALT = process.env.RATE_LIMIT_SALT ?? "dicteren-ratelimit-v1";

export function hashIp(ip: string | null | undefined): string {
  const raw = (ip ?? "unknown").trim();
  return createHash("sha256").update(SALT + raw).digest("hex").slice(0, 32);
}

export function getClientIp(request: Request): string {
  // Vercel + Cloudflare zetten een aantal headers. Pak de eerste publieke.
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

/** Check + record. Atomair-genoeg via DB. */
export async function checkRateLimit(args: {
  bucketKey: string;
  ipHash: string;
  /** Max requests in het window. */
  limit: number;
  /** Window-grootte in seconden. */
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
    return {
      allowed: false,
      resetInSeconds: args.windowSeconds,
    };
  }

  await db.insert(rateLimitEvents).values({
    bucketKey: args.bucketKey,
    ipHash: args.ipHash,
  });

  return { allowed: true, remaining: args.limit - count - 1 };
}

/** Opportunistische cleanup van oude events. Wordt periodiek aangeroepen
 *  vanuit een endpoint of cron — niet kritiek als 't even niet draait. */
export async function pruneRateLimitEvents(
  olderThanSeconds = 86_400,
): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanSeconds * 1000);
  await db
    .delete(rateLimitEvents)
    .where(sql`${rateLimitEvents.createdAt} < ${cutoff}`);
}
