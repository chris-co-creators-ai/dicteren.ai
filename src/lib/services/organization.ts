// Dicteren.ai — Organization service
//
// Helpers rond auth.organization (Better Auth) + organization_billing.
// Aanmaak van een nieuwe org bij self-service zakelijk-koop gaat via de
// Better Auth API (`auth.api.createOrganization`) in de route — die heeft
// de session-headers. Hier alleen DB-helpers en billing-upsert.

import "server-only";
import { and, eq } from "drizzle-orm";
import { dbAuth, db } from "@/lib/db";
import { authOrg, authMember } from "@/lib/db/auth-schema";
import {
  organizationBilling,
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

/** Owner-only: lijst van members + invitations voor admin/UI. */
export async function listOrganizationMembers(orgId: string) {
  return await dbAuth
    .select({
      memberId: authMember.id,
      userId: authMember.userId,
      role: authMember.role,
      memberSince: authMember.createdAt,
    })
    .from(authMember)
    .where(eq(authMember.organizationId, orgId));
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
