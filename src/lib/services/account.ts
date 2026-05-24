// Dicteren.ai — Account view service
// Centraal: alle account-facing license-queries gaan via deze service zodat
// /account, /account/licenses, /account/billing en future user-pages
// dezelfde "wat heeft deze user" bron gebruiken. Race-condition duplicates
// (status=revoked + notes "Race-condition") worden gefilterd zodat eind-
// gebruikers ze nooit zien — die zijn artefacten van trial.ts dedupe-fix.

import "server-only";
import { and, desc, eq, like, not, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licenseActivations,
  licenses,
  plans,
  subscriptions,
  type License,
} from "@/lib/db/schema";

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
  sql`${licenses.notes} IS NULL`,
  not(like(licenses.notes, "%Race-condition duplicate%")),
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

/** Alle licenses van deze user, race-duplicates uitgefilterd. */
export async function listUserLicenses(
  userId: string,
): Promise<UserLicense[]> {
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
    .where(and(eq(licenses.userId, userId), NOT_RACE_DUPLICATE))
    .orderBy(desc(licenses.issuedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const activations = await db
    .select({ licenseId: licenseActivations.licenseId })
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.isActive, true),
        sql`${licenseActivations.licenseId} = ANY(${ids})`,
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
