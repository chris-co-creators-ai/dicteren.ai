// Dicteren.ai — Account view service
// Centraal: alle account-facing license-queries gaan via deze service zodat
// /account, /account/licenses, /account/billing en future user-pages
// dezelfde "wat heeft deze user" bron gebruiken. Race-condition duplicates
// (status=revoked + notes "Race-condition") worden gefilterd zodat eind-
// gebruikers ze nooit zien — die zijn artefacten van trial.ts dedupe-fix.

import "server-only";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  like,
  notLike,
  or,
} from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import {
  licenseActivations,
  licenses,
  plans,
  subscriptions,
  type License,
} from "@/lib/db/schema";
import { authMember } from "@/lib/db/auth-schema";

/** Trial-rij geschikt voor /account hero. Null als geen actieve trial. */
export type UserTrial = {
  id: string;
  code: string;
  status: License["status"];
  expiresAt: Date | null;
  daysLeft: number;
  isActive: boolean;
};

/** Licentie-rij geschikt voor /account/licenses tabel. */
export type UserLicense = {
  id: string;
  code: string;
  type: License["type"];
  status: License["status"];
  seats: number;
  maxActivationsPerSeat: number;
  activeActivations: number;
  planLabel: string | null;
  issuedAt: string;
  expiresAt: string | null;
};

/** Subscription view geschikt voor /account billing-card. */
export type UserSubscription = {
  id: string;
  status: string;
  nextBillingAt: Date | null;
};

/** Filter dat race-condition duplicates verbergt (zelfde voor alle views). */
const NOT_RACE_DUPLICATE = or(
  isNull(licenses.notes),
  notLike(licenses.notes, "%Race-condition duplicate%"),
);

/** Haal de relevant trial voor deze user. Voorkeur: actief, anders meest recente. */
export async function getUserTrial(userId: string): Promise<UserTrial | null> {
  const [row] = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
    })
    .from(licenses)
    .where(
      and(
        eq(licenses.userId, userId),
        like(licenses.code, "DIC-TRIAL-%"),
        NOT_RACE_DUPLICATE,
      ),
    )
    .orderBy(desc(licenses.issuedAt))
    .limit(1);

  if (!row) return null;

  const now = Date.now();
  const isActive =
    row.status === "active" &&
    row.expiresAt !== null &&
    row.expiresAt.getTime() > now;
  const daysLeft = row.expiresAt
    ? Math.max(0, Math.ceil((row.expiresAt.getTime() - now) / 86_400_000))
    : 0;

  return {
    id: row.id,
    code: row.code,
    status: row.status,
    expiresAt: row.expiresAt,
    daysLeft,
    isActive,
  };
}

/** Alle licenses van deze user, race-duplicates uitgefilterd.
 *
 *  Vindt:
 *    1. Licenses waar `licenses.userId = user` (eigen aankoop / trial)
 *    2. Licenses waar `licenses.organizationId IN (orgs waar user member is)`
 *       (team-licenses voor de hele org)
 *
 *  Team-members zien zo de team-licentiecode van hun organisatie op /account.
 */
export async function listUserLicenses(
  userId: string,
): Promise<UserLicense[]> {
  const memberOrgs = await dbAuth
    .select({ organizationId: authMember.organizationId })
    .from(authMember)
    .where(eq(authMember.userId, userId));
  const orgIds = memberOrgs.map((m) => m.organizationId);

  const ownership = orgIds.length > 0
    ? or(eq(licenses.userId, userId), inArray(licenses.organizationId, orgIds))
    : eq(licenses.userId, userId);

  const rows = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      type: licenses.type,
      status: licenses.status,
      seats: licenses.seats,
      maxActivationsPerSeat: licenses.maxActivationsPerSeat,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
      planLabel: plans.label,
    })
    .from(licenses)
    .leftJoin(plans, eq(licenses.planId, plans.id))
    .where(and(ownership, NOT_RACE_DUPLICATE))
    .orderBy(desc(licenses.issuedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const activations = await db
    .select({ licenseId: licenseActivations.licenseId })
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.isActive, true),
        inArray(licenseActivations.licenseId, ids),
      ),
    );

  const activeByLicense = new Map<string, number>();
  for (const a of activations) {
    activeByLicense.set(
      a.licenseId,
      (activeByLicense.get(a.licenseId) ?? 0) + 1,
    );
  }

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    type: r.type,
    status: r.status,
    seats: r.seats,
    maxActivationsPerSeat: r.maxActivationsPerSeat,
    activeActivations: activeByLicense.get(r.id) ?? 0,
    planLabel: r.planLabel,
    issuedAt: r.issuedAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
  }));
}

/** Paid licenses (exclude trials). Voor /account hero "Licenties" count. */
export async function listUserPaidLicenses(
  userId: string,
): Promise<UserLicense[]> {
  const all = await listUserLicenses(userId);
  return all.filter((l) => !l.code.startsWith("DIC-TRIAL-"));
}

/** Subscription-row geschikt voor /account/billing tabel. */
export type UserSubscriptionForBilling = {
  id: string;
  mollieSubscriptionId: string;
  status: string;
  intervalLabel: string;
  amountCents: number;
  currency: string;
  seats: number;
  nextBillingAt: string | null;
  canceledAt: string | null;
  planLabel: string | null;
  licenseCode: string | null;
  licenseStatus: string | null;
};

/** Alle subscriptions van een user + plan-label + license-code voor /account/billing. */
export async function listUserSubscriptionsForBilling(
  userId: string,
): Promise<UserSubscriptionForBilling[]> {
  const subs = await db
    .select({
      id: subscriptions.id,
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      status: subscriptions.status,
      intervalLabel: subscriptions.intervalLabel,
      amountCents: subscriptions.amountCents,
      currency: subscriptions.currency,
      seats: subscriptions.seats,
      nextBillingAt: subscriptions.nextBillingAt,
      canceledAt: subscriptions.canceledAt,
      licenseId: subscriptions.licenseId,
      planLabel: plans.label,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId));

  if (subs.length === 0) return [];

  const linkedIds = subs
    .map((s) => s.licenseId)
    .filter((id): id is string => Boolean(id));
  const linkedLicenses = linkedIds.length
    ? await db
        .select({
          id: licenses.id,
          code: licenses.code,
          status: licenses.status,
        })
        .from(licenses)
        .where(inArray(licenses.id, linkedIds))
    : [];
  const licenseById = new Map(linkedLicenses.map((l) => [l.id, l]));

  return subs.map((s) => {
    const lic = s.licenseId ? licenseById.get(s.licenseId) : null;
    return {
      id: s.id,
      mollieSubscriptionId: s.mollieSubscriptionId,
      status: s.status,
      intervalLabel: s.intervalLabel,
      amountCents: s.amountCents,
      currency: s.currency,
      seats: s.seats,
      nextBillingAt: s.nextBillingAt?.toISOString() ?? null,
      canceledAt: s.canceledAt?.toISOString() ?? null,
      planLabel: s.planLabel,
      licenseCode: lic?.code ?? null,
      licenseStatus: lic?.status ?? null,
    };
  });
}

/** Actieve subscription (active of past_due), als die er is. */
export async function getUserActiveSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  const rows = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      nextBillingAt: subscriptions.nextBillingAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const active = rows.find(
    (s) => s.status === "active" || s.status === "past_due",
  );
  return active ?? null;
}

/** Unified subscription-view voor /account én Tauri abonnement-pagina.
 *  Geeft alles wat de UI moet tonen: license, plan, discount, mollie sub. */
export type SubscriptionView = {
  /** Bestaat er ueberhaupt een actieve/trial license voor deze user? */
  hasLicense: boolean;
  license: {
    id: string;
    code: string;
    type: License["type"];
    status: License["status"];
    issuedAt: string;
    expiresAt: string | null;
    source: string | null;
    /** Bv. "free_months" | "lifetime" — null = geen korting */
    discountType: string | null;
    /** 3 (= maanden), 20 (= %), etc. */
    discountValue: number | null;
  } | null;
  plan: {
    slug: string;
    label: string;
    period: string;
    priceCents: number;
    currency: string;
  } | null;
  subscription: {
    status: string;
    nextBillingAt: string | null;
    intervalLabel: string;
    amountCents: number;
    mollieSubscriptionId: string;
  } | null;
};

export async function getUserSubscriptionView(
  userId: string,
): Promise<SubscriptionView> {
  // Pak de actieve/trial license met hoogste prioriteit (paid > trial).
  const rows = await db
    .select({
      lic: licenses,
      plan: plans,
    })
    .from(licenses)
    .leftJoin(plans, eq(licenses.planId, plans.id))
    .where(and(eq(licenses.userId, userId), NOT_RACE_DUPLICATE))
    .orderBy(desc(licenses.issuedAt));

  if (rows.length === 0) {
    return { hasLicense: false, license: null, plan: null, subscription: null };
  }

  // Voorkeur: status active/past_due/trial, daarbij paid > trial.
  const ranked = rows.slice().sort((a, b) => {
    const score = (r: typeof rows[number]) => {
      const isPaid = !r.lic.code.startsWith("DIC-TRIAL-");
      const s = r.lic.status;
      const live =
        s === "active" || s === "past_due" || s === "trial" ? 1 : 0;
      return (isPaid ? 10 : 0) + live * 5 + (r.lic.issuedAt.getTime() / 1e13);
    };
    return score(b) - score(a);
  });
  const primary = ranked[0];
  const lic = primary.lic;
  const plan = primary.plan;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.licenseId, lic.id))
    .limit(1);

  return {
    hasLicense: true,
    license: {
      id: lic.id,
      code: lic.code,
      type: lic.type,
      status: lic.status,
      issuedAt: lic.issuedAt.toISOString(),
      expiresAt: lic.expiresAt?.toISOString() ?? null,
      source: lic.source ?? null,
      discountType: lic.discountType ?? null,
      discountValue: lic.discountValue ?? null,
    },
    plan: plan
      ? {
          slug: plan.slug,
          label: plan.label,
          period: plan.period,
          priceCents: plan.priceCents,
          currency: plan.currency,
        }
      : null,
    subscription: sub
      ? {
          status: sub.status,
          nextBillingAt: sub.nextBillingAt?.toISOString() ?? null,
          intervalLabel: sub.intervalLabel,
          amountCents: sub.amountCents,
          mollieSubscriptionId: sub.mollieSubscriptionId,
        }
      : null,
  };
}
