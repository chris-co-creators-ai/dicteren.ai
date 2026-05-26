// Dicteren.ai — Org seat-management service
//
// Centrale plek voor alle seat-math. Eén row in licenses = één seat.
// 1 seat = 1 code = 1 member = 2 devices (maxActivationsPerSeat).
//
// Domain-regels:
//   - unassigned   : code uitgegeven, nog geen userId, geen invite
//   - pending(invite-id): code gereserveerd voor specifieke email-invite
//   - active+userId: seat toegewezen, member kan activeren
//   - revoked      : seat ingetrokken (devices gerevoked), code dood
//
// Niet via deze service: Mollie-charges, subscription-replace. Die zit in
// services/orderUpgrade.ts. Hier puur seat-state.

import "server-only";
import { and, eq, inArray, isNull, isNotNull, sql, desc } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import {
  licenses,
  licenseActivations,
  subscriptions,
  type License,
} from "@/lib/db/schema";
import {
  authMember,
  authUser,
  authInvitation,
  authOrg,
} from "@/lib/db/auth-schema";
import {
  getTierForSeats,
  type SeatTier,
  type SeatTierId,
} from "./pricingTiers";
import { generateLicenseCode, hashLicenseCode } from "./license";
import { logEvent } from "./audit";

// ───── Read helpers ───────────────────────────────────────────────

export type OrgSeatSnapshot = {
  orgId: string;
  totalSeats: number;
  assignedSeats: number;
  pendingSeats: number;
  unassignedFreeSeats: number;
  revokedSeats: number;
  activeDevicesTotal: number;
  maxDevicesTotal: number;
  utilizationPct: number;
  currentTier: SeatTier;
  perSeatPriceCents: number;
  totalAnnualCents: number;
  subscription: {
    id: string;
    status: string;
    nextBillingAt: Date | null;
    mollieSubscriptionId: string;
    amountCents: number;
  } | null;
};

/** Compleet snapshot voor één org. Single query waar mogelijk. */
export async function getOrgSeatSnapshot(orgId: string): Promise<OrgSeatSnapshot> {
  // Tel licenses per status. Alleen team-rows (excludeer eventuele consumer).
  const rows = await db
    .select({
      status: licenses.status,
      invitationId: licenses.invitationId,
      userId: licenses.userId,
    })
    .from(licenses)
    .where(
      and(
        eq(licenses.organizationId, orgId),
        eq(licenses.type, "team"),
      ),
    );

  let totalSeats = 0;
  let assignedSeats = 0;
  let pendingSeats = 0;
  let unassignedFreeSeats = 0;
  let revokedSeats = 0;

  for (const r of rows) {
    if (
      r.status === "revoked" ||
      r.status === "refunded" ||
      r.status === "expired" ||
      r.status === "canceled"
    ) {
      revokedSeats++;
      continue;
    }
    totalSeats++;
    if (r.userId) {
      assignedSeats++;
    } else if (r.invitationId) {
      pendingSeats++;
    } else {
      unassignedFreeSeats++;
    }
  }

  // Tel actieve devices over alle live seats.
  const liveLicenseIds = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(
      and(
        eq(licenses.organizationId, orgId),
        eq(licenses.type, "team"),
        inArray(licenses.status, ["active", "trial", "past_due"]),
      ),
    );

  let activeDevicesTotal = 0;
  if (liveLicenseIds.length > 0) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(licenseActivations)
      .where(
        and(
          eq(licenseActivations.isActive, true),
          inArray(
            licenseActivations.licenseId,
            liveLicenseIds.map((l) => l.id),
          ),
        ),
      );
    activeDevicesTotal = count;
  }

  const maxDevicesTotal = totalSeats * 2;
  const utilizationPct =
    maxDevicesTotal === 0
      ? 0
      : Math.round((activeDevicesTotal / maxDevicesTotal) * 100);

  const currentTier = getTierForSeats(totalSeats);
  const perSeatPriceCents = currentTier.pricePerSeatCents;
  const totalAnnualCents = perSeatPriceCents * totalSeats;

  // Actieve subscription voor deze org (pak de meest recente actieve).
  const [sub] = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      nextBillingAt: subscriptions.nextBillingAt,
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      amountCents: subscriptions.amountCents,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, orgId),
        inArray(subscriptions.status, ["active", "past_due"]),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return {
    orgId,
    totalSeats,
    assignedSeats,
    pendingSeats,
    unassignedFreeSeats,
    revokedSeats,
    activeDevicesTotal,
    maxDevicesTotal,
    utilizationPct,
    currentTier,
    perSeatPriceCents,
    totalAnnualCents,
    subscription: sub ?? null,
  };
}

/** Snapshot van meerdere orgs in 1 round-trip — voor admin-lijst. */
export async function getOrgSeatSnapshotBulk(
  orgIds: string[],
): Promise<Map<string, OrgSeatSnapshot>> {
  const result = new Map<string, OrgSeatSnapshot>();
  // MVP: simpel for-loop. Bij >50 orgs zou je 1 grote query met GROUP BY doen.
  for (const orgId of orgIds) {
    result.set(orgId, await getOrgSeatSnapshot(orgId));
  }
  return result;
}

export type SeatRow = {
  licenseId: string;
  code: string;
  status: License["status"];
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignedUserEmail: string | null;
  pendingInvitationEmail: string | null;
  pendingInvitationId: string | null;
  pendingInvitationExpiresAt: Date | null;
  activeDevicesCount: number;
  assignedAt: Date | null;
  issuedAt: Date;
  expiresAt: Date | null;
  seatLabel: string | null;
};

/** Lijst van alle seats voor één org, verrijkt met member-naam en device-count. */
export async function listOrgSeats(orgId: string): Promise<SeatRow[]> {
  const rows = await db
    .select({
      licenseId: licenses.id,
      code: licenses.code,
      status: licenses.status,
      userId: licenses.userId,
      invitationId: licenses.invitationId,
      assignedAt: licenses.assignedAt,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
      seatLabel: licenses.seatLabel,
    })
    .from(licenses)
    .where(
      and(
        eq(licenses.organizationId, orgId),
        eq(licenses.type, "team"),
      ),
    )
    .orderBy(licenses.issuedAt);

  if (rows.length === 0) return [];

  // Verrijk: user-info voor assigned, invitation-info voor pending.
  const userIds = rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));
  const inviteIds = rows
    .map((r) => r.invitationId)
    .filter((id): id is string => Boolean(id));

  const users = userIds.length
    ? await dbAuth
        .select({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
        })
        .from(authUser)
        .where(inArray(authUser.id, userIds))
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const invites = inviteIds.length
    ? await dbAuth
        .select({
          id: authInvitation.id,
          email: authInvitation.email,
          expiresAt: authInvitation.expiresAt,
        })
        .from(authInvitation)
        .where(inArray(authInvitation.id, inviteIds))
    : [];
  const inviteMap = new Map(invites.map((i) => [i.id, i]));

  // Device-count per license
  const licenseIds = rows.map((r) => r.licenseId);
  const devices = await db
    .select({
      licenseId: licenseActivations.licenseId,
      count: sql<number>`count(*)::int`,
    })
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.isActive, true),
        inArray(licenseActivations.licenseId, licenseIds),
      ),
    )
    .groupBy(licenseActivations.licenseId);
  const deviceMap = new Map(devices.map((d) => [d.licenseId, d.count]));

  return rows.map((r) => {
    const user = r.userId ? userMap.get(r.userId) : null;
    const invite = r.invitationId ? inviteMap.get(r.invitationId) : null;
    return {
      licenseId: r.licenseId,
      code: r.code,
      status: r.status,
      assignedUserId: r.userId,
      assignedUserName: user?.name ?? null,
      assignedUserEmail: user?.email ?? null,
      pendingInvitationEmail: invite?.email ?? null,
      pendingInvitationId: invite?.id ?? null,
      pendingInvitationExpiresAt: invite?.expiresAt ?? null,
      activeDevicesCount: deviceMap.get(r.licenseId) ?? 0,
      assignedAt: r.assignedAt,
      issuedAt: r.issuedAt,
      expiresAt: r.expiresAt,
      seatLabel: r.seatLabel,
    };
  });
}

/** Pak één vrije seat (geen userId, geen invitationId, status=active|unassigned). */
export async function findUnassignedSeat(
  orgId: string,
): Promise<License | null> {
  const [row] = await db
    .select()
    .from(licenses)
    .where(
      and(
        eq(licenses.organizationId, orgId),
        eq(licenses.type, "team"),
        isNull(licenses.userId),
        isNull(licenses.invitationId),
        inArray(licenses.status, ["active", "unassigned"]),
      ),
    )
    .orderBy(licenses.issuedAt)
    .limit(1);
  return row ?? null;
}

// ───── Devices per seat ───────────────────────────────────────────

export type SeatDeviceRow = {
  activationId: string;
  deviceId: string;
  licenseId: string;
  licenseCode: string;
  memberUserId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  platform: string | null;
  appVersion: string | null;
  fingerprint: string;
  activatedAt: Date;
  lastSeenAt: Date | null;
  isActive: boolean;
};

/** Alle device-activaties voor een org, met member-info. Voor Apparaten-tab. */
export async function listOrgDevices(orgId: string): Promise<SeatDeviceRow[]> {
  const result = await db.execute<{
    activation_id: string;
    device_id: string;
    license_id: string;
    license_code: string;
    member_user_id: string | null;
    platform: string | null;
    app_version: string | null;
    fingerprint: string;
    activated_at: Date;
    last_seen_at: Date | null;
    is_active: boolean;
  }>(sql`
    SELECT
      la.id AS activation_id,
      la.device_id,
      la.license_id,
      l.code AS license_code,
      l.user_id AS member_user_id,
      d.platform,
      d.app_version,
      d.fingerprint,
      la.activated_at,
      d.last_seen_at,
      la.is_active
    FROM license_activations la
    JOIN licenses l ON l.id = la.license_id
    JOIN devices d ON d.id = la.device_id
    WHERE l.organization_id = ${orgId}
      AND l.type = 'team'
    ORDER BY la.activated_at DESC
  `);

  const rows = (result as unknown as { rows?: typeof result }).rows ?? result;
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return [];

  const memberIds = list
    .map((r) => r.member_user_id)
    .filter((id): id is string => Boolean(id));
  const users = memberIds.length
    ? await dbAuth
        .select({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
        })
        .from(authUser)
        .where(inArray(authUser.id, memberIds))
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return list.map((r) => {
    const user = r.member_user_id ? userMap.get(r.member_user_id) : null;
    return {
      activationId: r.activation_id,
      deviceId: r.device_id,
      licenseId: r.license_id,
      licenseCode: r.license_code,
      memberUserId: r.member_user_id,
      memberName: user?.name ?? null,
      memberEmail: user?.email ?? null,
      platform: r.platform,
      appVersion: r.app_version,
      fingerprint: r.fingerprint,
      activatedAt: r.activated_at,
      lastSeenAt: r.last_seen_at,
      isActive: r.is_active,
    };
  });
}

// ───── Mutate ─────────────────────────────────────────────────────

/** Wijs een vrije/pending seat toe aan een member. Idempotent. */
export async function assignSeatToMember(args: {
  licenseId: string;
  userId: string;
  actorUserId: string;
}): Promise<void> {
  await db
    .update(licenses)
    .set({
      userId: args.userId,
      assignedAt: new Date(),
      invitationId: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, args.licenseId));

  await logEvent({
    action: "organization.seat_assigned",
    entityType: "license",
    entityId: args.licenseId,
    actorId: args.actorUserId,
    metadata: { userId: args.userId },
  });
}

/** Koppel een seat aan een pending invite. Reserveert de seat. */
export async function reserveSeatForInvitation(args: {
  licenseId: string;
  invitationId: string;
  actorUserId: string;
}): Promise<void> {
  await db
    .update(licenses)
    .set({
      invitationId: args.invitationId,
      userId: null,
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, args.licenseId));
}

/** Maak een seat weer vrij (na invite-cancel of invite-expired). */
export async function releaseSeatReservation(licenseId: string): Promise<void> {
  await db
    .update(licenses)
    .set({
      invitationId: null,
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, licenseId));
}

/** Trek een seat in. Revoke alle devices van de member voor deze seat. */
export async function revokeSeat(args: {
  licenseId: string;
  actorUserId: string;
  reason: "owner_action" | "admin_action" | "member_left" | "downgrade";
}): Promise<{ revokedDevices: number; previousUserId: string | null }> {
  const [seat] = await db
    .select({ userId: licenses.userId })
    .from(licenses)
    .where(eq(licenses.id, args.licenseId))
    .limit(1);
  const previousUserId = seat?.userId ?? null;

  // Devices off
  const deactivated = await db
    .update(licenseActivations)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(
      and(
        eq(licenseActivations.licenseId, args.licenseId),
        eq(licenseActivations.isActive, true),
      ),
    )
    .returning({ id: licenseActivations.id });

  // Seat zelf naar revoked. We bewaren de license-row (audit). Een seat-add
  // later maakt een nieuwe row.
  await db
    .update(licenses)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, args.licenseId));

  await logEvent({
    action: "license.activation_revoked",
    entityType: "license",
    entityId: args.licenseId,
    actorId: args.actorUserId,
    metadata: {
      reason: args.reason,
      revokedDevices: deactivated.length,
      previousUserId,
    },
  });

  return { revokedDevices: deactivated.length, previousUserId };
}

/** Verplaats een seat van member A naar member B. */
export async function reassignSeat(args: {
  licenseId: string;
  toUserId: string;
  actorUserId: string;
}): Promise<{ previousUserId: string | null; revokedDevices: number }> {
  const [seat] = await db
    .select({ userId: licenses.userId })
    .from(licenses)
    .where(eq(licenses.id, args.licenseId))
    .limit(1);
  const previousUserId = seat?.userId ?? null;

  // Revoke devices van oude member
  const deactivated = await db
    .update(licenseActivations)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(
      and(
        eq(licenseActivations.licenseId, args.licenseId),
        eq(licenseActivations.isActive, true),
      ),
    )
    .returning({ id: licenseActivations.id });

  // Reassign
  await db
    .update(licenses)
    .set({
      userId: args.toUserId,
      assignedAt: new Date(),
      invitationId: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, args.licenseId));

  await logEvent({
    action: "organization.seat_reassigned",
    entityType: "license",
    entityId: args.licenseId,
    actorId: args.actorUserId,
    metadata: {
      previousUserId,
      newUserId: args.toUserId,
      revokedDevices: deactivated.length,
    },
  });

  return { previousUserId, revokedDevices: deactivated.length };
}

/** Revoke een specifieke device-activatie. Owner of admin actie. */
export async function revokeActivation(args: {
  activationId: string;
  actorUserId: string;
  reason: string;
}): Promise<{ memberUserId: string | null; licenseId: string | null }> {
  const [act] = await db
    .select({
      id: licenseActivations.id,
      licenseId: licenseActivations.licenseId,
      userId: licenseActivations.userId,
    })
    .from(licenseActivations)
    .where(eq(licenseActivations.id, args.activationId))
    .limit(1);
  if (!act) return { memberUserId: null, licenseId: null };

  await db
    .update(licenseActivations)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(eq(licenseActivations.id, act.id));

  await logEvent({
    action: "license.activation_revoked",
    entityType: "license",
    entityId: act.licenseId,
    actorId: args.actorUserId,
    metadata: {
      activationId: act.id,
      memberUserId: act.userId,
      reason: args.reason,
    },
  });

  return { memberUserId: act.userId, licenseId: act.licenseId };
}

/** Revoke alle activations van member binnen één org. Voor member-removal. */
export async function revokeAllActivationsForMember(args: {
  orgId: string;
  userId: string;
  actorUserId: string;
  reason: string;
}): Promise<{ revoked: number }> {
  const seats = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(
      and(
        eq(licenses.organizationId, args.orgId),
        eq(licenses.userId, args.userId),
        eq(licenses.type, "team"),
      ),
    );
  if (seats.length === 0) return { revoked: 0 };

  const result = await db
    .update(licenseActivations)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(
      and(
        inArray(
          licenseActivations.licenseId,
          seats.map((s) => s.id),
        ),
        eq(licenseActivations.userId, args.userId),
        eq(licenseActivations.isActive, true),
      ),
    )
    .returning({ id: licenseActivations.id });

  return { revoked: result.length };
}

// ───── Seat-creatie (na betaling of admin-grant) ─────────────────

/** Maak N nieuwe team-licenses aan in `unassigned` status. */
export async function createUnassignedSeats(args: {
  organizationId: string;
  count: number;
  planId: string | null;
  orderId: string | null;
  expiresAt: Date;
  source: string;
  status?: "unassigned" | "active" | "pending_payment";
}): Promise<{ licenseIds: string[]; codes: string[] }> {
  const codes: string[] = [];
  const licenseIds: string[] = [];
  const status = args.status ?? "unassigned";

  for (let i = 0; i < args.count; i++) {
    const code = generateLicenseCode("team");
    const codeHash = hashLicenseCode(code);
    const [row] = await db
      .insert(licenses)
      .values({
        code,
        codeHash,
        type: "team",
        status,
        userId: null,
        organizationId: args.organizationId,
        orderId: args.orderId,
        planId: args.planId,
        seats: 1,
        maxActivationsPerSeat: 2,
        source: args.source,
        expiresAt: args.expiresAt,
      })
      .returning({ id: licenses.id });
    licenseIds.push(row.id);
    codes.push(code);
  }
  return { licenseIds, codes };
}

// ───── Membership helpers ────────────────────────────────────────

/** Membership row van user in org, of null. */
export async function getMembership(args: {
  orgId: string;
  userId: string;
}): Promise<{ memberId: string; role: string } | null> {
  const [row] = await dbAuth
    .select({
      memberId: authMember.id,
      role: authMember.role,
    })
    .from(authMember)
    .where(
      and(
        eq(authMember.userId, args.userId),
        eq(authMember.organizationId, args.orgId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Owner van een org (er is er altijd precies één). */
export async function getOrgOwner(orgId: string): Promise<{
  userId: string;
  name: string;
  email: string;
} | null> {
  const [row] = await dbAuth
    .select({
      userId: authMember.userId,
      name: authUser.name,
      email: authUser.email,
    })
    .from(authMember)
    .innerJoin(authUser, eq(authUser.id, authMember.userId))
    .where(
      and(
        eq(authMember.organizationId, orgId),
        eq(authMember.role, "owner"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Org-info ophalen via auth schema. */
export async function getOrgInfo(orgId: string): Promise<{
  id: string;
  name: string;
  slug: string | null;
} | null> {
  const [row] = await dbAuth
    .select({
      id: authOrg.id,
      name: authOrg.name,
      slug: authOrg.slug,
    })
    .from(authOrg)
    .where(eq(authOrg.id, orgId))
    .limit(1);
  return row ?? null;
}

/** Helper voor enum-naar-pricing tier-id mapping in subscription history. */
export function tierIdString(tier: SeatTier): SeatTierId {
  return tier.id;
}

// Re-export Tier-type voor consumers van deze module
export type { SeatTier } from "./pricingTiers";
