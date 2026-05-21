import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licenseActivations,
  licenses,
  plans,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { LicensesView } from "./licenses-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn licenties · Dicteren.ai" };

export default async function AccountLicensesPage() {
  // Layout guard ran requireAuth already, but read for the userId.
  const session = (await getSession())!;

  const rows = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      type: licenses.type,
      status: licenses.status,
      seats: licenses.seats,
      maxActivationsPerSeat: licenses.maxActivationsPerSeat,
      activationCount: licenses.activationCount,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
      planLabel: plans.label,
      planSlug: plans.slug,
    })
    .from(licenses)
    .leftJoin(plans, eq(licenses.planId, plans.id))
    .where(eq(licenses.userId, session.user.id));

  const licenseIds = rows.map((r) => r.id);
  const allActivations = licenseIds.length
    ? await db
        .select()
        .from(licenseActivations)
        .where(inArray(licenseActivations.licenseId, licenseIds))
    : [];

  const activationsByLicense = new Map<string, number>();
  for (const a of allActivations) {
    if (!a.isActive) continue;
    activationsByLicense.set(
      a.licenseId,
      (activationsByLicense.get(a.licenseId) ?? 0) + 1,
    );
  }

  return (
    <LicensesView
      licenses={rows.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        status: r.status,
        seats: r.seats,
        maxActivationsPerSeat: r.maxActivationsPerSeat,
        activeActivations: activationsByLicense.get(r.id) ?? 0,
        planLabel: r.planLabel,
        issuedAt: r.issuedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
      }))}
    />
  );
}
