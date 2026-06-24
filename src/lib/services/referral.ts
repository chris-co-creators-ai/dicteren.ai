import "server-only";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { authUsers, referrals, referralRewards } from "@/lib/db/schema";

// Vrienden uitnodigen (PRD vrienden-uitnodigen): refer-a-friend met gratis maanden.
// Aanbrenger + aangebrachte krijgen elk 1 maand. Aangebrachte krijgt 'm bij signup;
// aanbrenger zodra de aangebrachte betalend wordt (gate). Apart van de cash-affiliates.

const REWARD_MONTHS = 1;

/** Genereer een leesbare invite-code: VOORNAAM + 3 cijfers (à la Wispr), anders random. */
function genReferralCode(firstName?: string | null): string {
  const base = (firstName ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[^A-Z]/g, "")
    .slice(0, 12);
  const num = String(randomBytes(2).readUInt16BE(0) % 1000).padStart(3, "0");
  if (base) return `${base}${num}`;
  return `DICT${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Haal de invite-code van een user op; genereer + bewaar 'm bij eerste keer. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const [u] = await db
    .select({ code: authUsers.referralCode, firstName: authUsers.firstName, name: authUsers.name })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  if (u?.code) return u.code;

  const first = u?.firstName ?? (u?.name ? u.name.trim().split(/\s+/)[0] : null);
  let code = genReferralCode(first);
  for (let i = 0; i < 6; i++) {
    const [exists] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.referralCode, code))
      .limit(1);
    if (!exists) break;
    code = genReferralCode(first);
  }
  await db.update(authUsers).set({ referralCode: code }).where(eq(authUsers.id, userId));
  return code;
}

/** Resolve een invite-code naar de aanbrenger (user-id). Codes zijn uppercase. */
export async function getReferrerByCode(code: string): Promise<string | null> {
  const norm = (code ?? "").trim().toUpperCase();
  if (!norm) return null;
  const [u] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.referralCode, norm))
    .limit(1);
  return u?.id ?? null;
}

export async function getReferralByReferred(referredUserId: string) {
  const [r] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1);
  return r ?? null;
}

/**
 * Leg de referral vast (first-touch) + ken de aangebrachte z'n gratis maand toe.
 * Idempotent: één referral per aangebrachte (unique), self-referral wordt geweigerd.
 */
export async function attributeReferral(args: {
  referrerUserId: string;
  referredUserId: string;
  referredEmail?: string | null;
  referrerCode?: string | null;
  source?: "link" | "code";
}): Promise<{ created: boolean; referralId: string | null }> {
  if (args.referrerUserId === args.referredUserId) {
    return { created: false, referralId: null };
  }

  const [row] = await db
    .insert(referrals)
    .values({
      referrerUserId: args.referrerUserId,
      referredUserId: args.referredUserId,
      referredEmail: args.referredEmail ?? null,
      referrerCode: args.referrerCode ?? null,
      source: args.source ?? "link",
    })
    .onConflictDoNothing({ target: referrals.referredUserId })
    .returning({ id: referrals.id });

  if (!row) {
    // Al een referral voor deze aangebrachte (first-touch wint).
    const existing = await getReferralByReferred(args.referredUserId);
    return { created: false, referralId: existing?.id ?? null };
  }

  // Aangebrachte krijgt z'n maand meteen (op het eerste abonnement).
  await db
    .insert(referralRewards)
    .values({
      referralId: row.id,
      userId: args.referredUserId,
      role: "referred",
      months: REWARD_MONTHS,
    })
    .onConflictDoNothing({
      target: [referralRewards.referralId, referralRewards.role],
    });

  return { created: true, referralId: row.id };
}

/**
 * Gate: de aangebrachte is betalend geworden. Zet de referral op 'qualified' en ken
 * de AANBRENGER z'n gratis maand toe. Idempotent (alleen vanuit 'pending').
 */
export async function qualifyReferral(
  referredUserId: string,
): Promise<{ qualified: boolean; referralId: string | null }> {
  const referral = await getReferralByReferred(referredUserId);
  if (!referral || referral.status !== "pending") {
    return { qualified: false, referralId: referral?.id ?? null };
  }

  await db
    .update(referrals)
    .set({ status: "qualified", qualifiedAt: new Date() })
    .where(
      and(eq(referrals.id, referral.id), eq(referrals.status, "pending")),
    );

  await db
    .insert(referralRewards)
    .values({
      referralId: referral.id,
      userId: referral.referrerUserId,
      role: "referrer",
      months: REWARD_MONTHS,
    })
    .onConflictDoNothing({
      target: [referralRewards.referralId, referralRewards.role],
    });

  return { qualified: true, referralId: referral.id };
}
