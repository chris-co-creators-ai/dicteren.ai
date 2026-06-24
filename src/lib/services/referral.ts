import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  authUsers,
  licenses,
  referrals,
  referralRewards,
} from "@/lib/db/schema";

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

  const [rw] = await db
    .insert(referralRewards)
    .values({
      referralId: referral.id,
      userId: referral.referrerUserId,
      role: "referrer",
      months: REWARD_MONTHS,
    })
    .onConflictDoNothing({
      target: [referralRewards.referralId, referralRewards.role],
    })
    .returning({ id: referralRewards.id });

  // Aanbrenger is een bestaande klant → meestal meteen toepasbaar. Cron is backstop.
  if (rw) {
    try {
      await applyReward(rw.id);
    } catch (e) {
      console.error("apply referrer reward failed", e);
    }
  }

  return { qualified: true, referralId: referral.id };
}

// ───── Reward-uitlevering (Fase 4, optie A: licentie verlengen) ─────
// Een pending reward levert z'n gratis maand door de `expiresAt` van de huidige
// licentie van de user te verlengen. Renewals verlengen vanaf de einddatum
// (order.ts), dus de bonus overleeft een incasso. Géén Mollie-charge-manipulatie.
// Claim-first (status pending → applied) zodat een reward nooit dubbel verlengt.

export async function applyReward(
  rewardId: string,
): Promise<{ applied: boolean; method: string }> {
  const [reward] = await db
    .select()
    .from(referralRewards)
    .where(eq(referralRewards.id, rewardId))
    .limit(1);
  if (!reward || reward.status !== "pending") {
    return { applied: false, method: "skip" };
  }

  // Huidige licentie met einddatum (actief of trial), nieuwste eerst.
  const [lic] = await db
    .select({ id: licenses.id, expiresAt: licenses.expiresAt })
    .from(licenses)
    .where(
      and(
        eq(licenses.userId, reward.userId),
        inArray(licenses.status, ["active", "trial"]),
        isNotNull(licenses.expiresAt),
      ),
    )
    .orderBy(desc(licenses.expiresAt))
    .limit(1);

  // Geen einddatum-licentie? Check op lifetime (niks te verlengen) vs nog-geen-licentie.
  let method: string;
  if (lic) {
    method = "license_extend";
  } else {
    const [lifetime] = await db
      .select({ id: licenses.id })
      .from(licenses)
      .where(
        and(
          eq(licenses.userId, reward.userId),
          inArray(licenses.status, ["active", "trial"]),
          isNull(licenses.expiresAt),
        ),
      )
      .limit(1);
    if (lifetime) {
      method = "lifetime_noop"; // al lifetime, niks te verlengen
    } else {
      // Nog geen licentie (bv. vriend heeft trial nog niet geclaimd). Blijft
      // pending; de cron probeert het opnieuw zodra er een licentie is.
      return { applied: false, method: "no_license_yet" };
    }
  }

  // Claim de reward idempotent: alleen vanuit pending. Voorkomt dubbel verlengen.
  const claimed = await db
    .update(referralRewards)
    .set({ status: "applied", applyMethod: method, appliedAt: new Date() })
    .where(
      and(
        eq(referralRewards.id, rewardId),
        eq(referralRewards.status, "pending"),
      ),
    )
    .returning({ id: referralRewards.id });
  if (!claimed.length) return { applied: false, method: "already" };

  // Verleng pas ná de claim (alleen bij een einddatum-licentie).
  if (lic) {
    const base =
      lic.expiresAt && lic.expiresAt.getTime() > Date.now()
        ? new Date(lic.expiresAt)
        : new Date();
    base.setMonth(base.getMonth() + reward.months);
    await db
      .update(licenses)
      .set({ expiresAt: base })
      .where(eq(licenses.id, lic.id));
  }

  return { applied: true, method };
}

/** Batch voor de cron: pas alle pending rewards toe. Idempotent. */
export async function applyPendingReferralRewards(): Promise<{
  applied: number;
  stillPending: number;
}> {
  const pending = await db
    .select({ id: referralRewards.id })
    .from(referralRewards)
    .where(eq(referralRewards.status, "pending"));
  let applied = 0;
  for (const r of pending) {
    const res = await applyReward(r.id);
    if (res.applied) applied++;
  }
  return { applied, stillPending: pending.length - applied };
}
