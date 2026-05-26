// Dicteren.ai — Organization service
//
// Helpers rond auth.organization (Better Auth) + organization_billing.
// Aanmaak van een nieuwe org bij self-service zakelijk-koop gaat via de
// Better Auth API (`auth.api.createOrganization`) in de route — die heeft
// de session-headers. Hier alleen DB-helpers en billing-upsert.

import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { dbAuth, db } from "@/lib/db";
import {
  authOrg,
  authMember,
  authUser,
  authInvitation,
} from "@/lib/db/auth-schema";
import {
  licenses,
  organizationBilling,
  type License,
  type OrganizationBilling,
  type NewOrganizationBilling,
} from "@/lib/db/schema";
import { randomBytes } from "crypto";

/** Lookup org-row by id. Geeft null bij niet bestaan. */
export async function getOrganization(orgId: string) {
  const [row] = await dbAuth
    .select()
    .from(authOrg)
    .where(eq(authOrg.id, orgId))
    .limit(1);
  return row ?? null;
}

/** Lookup org-billing by orgId. */
export async function getOrganizationBilling(
  orgId: string,
): Promise<OrganizationBilling | null> {
  const [row] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.organizationId, orgId))
    .limit(1);
  return row ?? null;
}

/** Is deze user member van deze org? Returns member-row of null. */
export async function getMembership(args: {
  userId: string;
  organizationId: string;
}) {
  const [row] = await dbAuth
    .select({
      id: authMember.id,
      role: authMember.role,
      createdAt: authMember.createdAt,
    })
    .from(authMember)
    .where(
      and(
        eq(authMember.userId, args.userId),
        eq(authMember.organizationId, args.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Alle orgs waarvan deze user member is. Voor /account/organization picker. */
export async function listUserOrganizations(userId: string) {
  return await dbAuth
    .select({
      id: authOrg.id,
      name: authOrg.name,
      slug: authOrg.slug,
      role: authMember.role,
      memberSince: authMember.createdAt,
    })
    .from(authMember)
    .innerJoin(authOrg, eq(authOrg.id, authMember.organizationId))
    .where(eq(authMember.userId, userId));
}

/** Orgs waar deze user owner of admin van is (kan beheren). */
export async function listManageableOrganizations(userId: string) {
  const all = await listUserOrganizations(userId);
  return all.filter((o) => o.role === "owner" || o.role === "admin");
}

/** Members met user-name/email join. Voor /account/organization view. */
export async function listOrganizationMembers(orgId: string) {
  return await dbAuth
    .select({
      memberId: authMember.id,
      userId: authMember.userId,
      role: authMember.role,
      name: authUser.name,
      email: authUser.email,
      memberSince: authMember.createdAt,
    })
    .from(authMember)
    .innerJoin(authUser, eq(authUser.id, authMember.userId))
    .where(eq(authMember.organizationId, orgId))
    .orderBy(authMember.createdAt);
}

/** Pending invitations voor een org. */
export async function listOrganizationInvitations(orgId: string) {
  return await dbAuth
    .select({
      id: authInvitation.id,
      email: authInvitation.email,
      role: authInvitation.role,
      status: authInvitation.status,
      expiresAt: authInvitation.expiresAt,
    })
    .from(authInvitation)
    .where(
      and(
        eq(authInvitation.organizationId, orgId),
        eq(authInvitation.status, "pending"),
      ),
    )
    .orderBy(desc(authInvitation.expiresAt));
}

/** Team-licenses gekoppeld aan een org. */
export async function listOrganizationLicenses(
  orgId: string,
): Promise<
  Pick<License, "id" | "code" | "status" | "seats" | "maxActivationsPerSeat" | "expiresAt">[]
> {
  return await db
    .select({
      id: licenses.id,
      code: licenses.code,
      status: licenses.status,
      seats: licenses.seats,
      maxActivationsPerSeat: licenses.maxActivationsPerSeat,
      expiresAt: licenses.expiresAt,
    })
    .from(licenses)
    .where(eq(licenses.organizationId, orgId))
    .orderBy(desc(licenses.issuedAt));
}

/** Genereer een unieke slug op basis van een organisatie-naam. */
export function deriveOrganizationSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return base ? `${base}-${suffix}` : `org-${suffix}`;
}

export type OrganizationBillingInput = Omit<
  NewOrganizationBilling,
  "organizationId" | "createdAt" | "updatedAt"
>;

/** Upsert van billing-row voor een org. Idempotent. */
export async function upsertOrganizationBilling(
  orgId: string,
  data: OrganizationBillingInput,
): Promise<OrganizationBilling> {
  const [row] = await db
    .insert(organizationBilling)
    .values({
      organizationId: orgId,
      ...data,
    })
    .onConflictDoUpdate({
      target: organizationBilling.organizationId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
