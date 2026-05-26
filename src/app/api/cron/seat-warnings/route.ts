// Dicteren.ai — Daily seat-warnings cron
//
// Voor elke org met active subscription: check utilization. Stuur:
//   - 80%-warning één keer per cyclus naar owner ("seat-pool raakt vol")
//   - 100%-alarm één keer per cyclus naar owner ("geen vrije seats meer")
// Dedup via public.org_seat_warnings.

import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { orgSeatWarnings, subscriptions } from "@/lib/db/schema";
import { authOrg } from "@/lib/db/auth-schema";
import { getOrgSeatSnapshot, getOrgOwner } from "@/lib/services/orgSeats";
import { logEvent } from "@/lib/services/audit";
import { sendOrgSeatsExpandedEmail } from "@/lib/services/orgEmail";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pak alle orgs met active sub
  const activeSubs = await db
    .select({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "past_due"]));

  const orgIds = [
    ...new Set(
      activeSubs
        .map((s) => s.organizationId)
        .filter((x): x is string => Boolean(x)),
    ),
  ];

  let warned80 = 0;
  let warned100 = 0;

  for (const orgId of orgIds) {
    const snapshot = await getOrgSeatSnapshot(orgId);
    if (snapshot.totalSeats === 0) continue;
    const util = snapshot.utilizationPct;

    const [existing] = await db
      .select()
      .from(orgSeatWarnings)
      .where(eq(orgSeatWarnings.organizationId, orgId))
      .limit(1);

    const lastReset =
      existing?.lastResetAt ??
      snapshot.subscription?.nextBillingAt ??
      new Date(Date.now() - 365 * 86_400_000);

    const warnedRecently80 =
      existing?.warnedAt80 && existing.warnedAt80 > lastReset;
    const warnedRecently100 =
      existing?.warnedAt100 && existing.warnedAt100 > lastReset;

    let action: "100" | "80" | null = null;
    if (util >= 100 && !warnedRecently100) action = "100";
    else if (util >= 80 && !warnedRecently80) action = "80";

    if (!action) continue;

    // Lookup owner + org-name
    const owner = await getOrgOwner(orgId);
    if (!owner) continue;
    const [orgRow] = await dbAuth
      .select({ name: authOrg.name })
      .from(authOrg)
      .where(eq(authOrg.id, orgId))
      .limit(1);

    // We reuse the seats_expanded template als waarschuwing — TOM-bezig
    // is dat een "korte" call-to-action mail die naar het dashboard linkt.
    // Voor MVP voldoende; later eigen template.
    void sendOrgSeatsExpandedEmail({
      to: owner.email,
      ownerName: owner.name,
      organizationName: orgRow?.name ?? "je organisatie",
      delta: 0,
      newTotal: snapshot.totalSeats,
      newAnnualCents: snapshot.totalAnnualCents,
      currency: "EUR",
      prorataChargeCents: 0,
      newCodes: [],
      userId: owner.userId,
    });

    await logEvent({
      action: "organization.seat_limit_warning",
      entityType: "organization",
      entityId: orgId,
      metadata: { utilizationPct: util, level: action },
    });

    // Upsert dedup-rij
    const now = new Date();
    await db
      .insert(orgSeatWarnings)
      .values({
        organizationId: orgId,
        warnedAt80: action === "80" ? now : (existing?.warnedAt80 ?? null),
        warnedAt100: action === "100" ? now : (existing?.warnedAt100 ?? null),
        lastResetAt: existing?.lastResetAt ?? lastReset,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: orgSeatWarnings.organizationId,
        set: {
          warnedAt80: action === "80" ? now : (existing?.warnedAt80 ?? null),
          warnedAt100:
            action === "100" ? now : (existing?.warnedAt100 ?? null),
          updatedAt: now,
        },
      });

    if (action === "100") warned100++;
    else warned80++;
  }

  return NextResponse.json({ ok: true, warned80, warned100 });
}
