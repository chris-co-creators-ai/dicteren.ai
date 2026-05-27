// Dicteren.ai — Admin affiliate update endpoint (V2: slug, per-type, approval).

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { requireStaffApi } from "@/lib/auth/session";
import { getAffiliateById } from "@/lib/services/affiliate";
import { validateSlugAvailable } from "@/lib/services/affiliateSlug";
import { sendAffiliateApprovedEmail } from "@/lib/services/affiliateEmail";
import { logEvent } from "@/lib/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const existing = await getAffiliateById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Affiliate niet gevonden" },
      { status: 404 },
    );
  }

  // Slug-validatie
  let slugForUpdate: string | null | undefined;
  if ("slug" in body) {
    const raw = body.slug as string | null | undefined;
    if (raw === null || raw === "" || raw === undefined) {
      slugForUpdate = null;
    } else {
      const validation = await validateSlugAvailable(String(raw), id);
      if (!validation.ok) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error,
            code:
              validation.code === "TAKEN" ? "SLUG_TAKEN" : "INVALID_SLUG",
          },
          { status: 400 },
        );
      }
      slugForUpdate = validation.slug;
    }
  }

  // Whitelisted velden voor patch
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = [
    "name",
    "displayName",
    "welcomeMessage",
    "contactEmail",
    "contactPhone",
    "status",
    "commissionType",
    "commissionPct",
    "commissionFixedCents",
    "consumerCommissionType",
    "consumerCommissionPct",
    "consumerCommissionFixedCents",
    "consumerCommissionDurationMonths",
    "consumerRecurringCommissionPct",
    "consumerRecurringCommissionFixedCents",
    "businessCommissionType",
    "businessCommissionPct",
    "businessCommissionFixedCents",
    "businessCommissionDurationMonths",
    "businessRecurringCommissionPct",
    "businessRecurringCommissionFixedCents",
    "minimumPayoutCents",
    "payoutMethod",
    "payoutDetails",
    "internalNotes",
  ];
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }
  if (slugForUpdate !== undefined) patch.slug = slugForUpdate;

  // Trigger approval-mail bij pending→active flip
  const isApproving =
    body.status === "active" && existing.status !== "active";
  if (isApproving) patch.approvedAt = new Date();

  const [updated] = await db
    .update(affiliates)
    .set(patch)
    .where(eq(affiliates.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Update mislukt" },
      { status: 500 },
    );
  }

  await logEvent({
    action: isApproving ? "affiliate.updated" : "affiliate.updated",
    entityType: "affiliate",
    entityId: id,
    actorId: session.user.id,
    metadata: { fields: Object.keys(body), isApproving },
  });

  if (isApproving && updated.slug) {
    void sendAffiliateApprovedEmail({
      to: updated.contactEmail,
      name: updated.displayName ?? updated.name,
      slug: updated.slug,
      contactEmail: updated.contactEmail,
      userId: updated.userId ?? undefined,
    });
  }

  return NextResponse.json({ success: true, affiliate: updated });
}
