// Dicteren.ai — Patch één custom-field op een customer.
// Merge-stijl: bestaande customFields blijven behouden.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaffApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { customerAttributes } from "@/lib/db/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { userId } = await params;

  let body: { key?: string; value?: string | number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.key) {
    return NextResponse.json(
      { success: false, error: "key verplicht" },
      { status: 400 },
    );
  }

  // Lees bestaande customFields.
  const [existing] = await db
    .select({ customFields: customerAttributes.customFields })
    .from(customerAttributes)
    .where(eq(customerAttributes.userId, userId))
    .limit(1);

  const current = (existing?.customFields as Record<
    string,
    string | number | null
  >) ?? {};
  if (body.value === null || body.value === undefined || body.value === "") {
    delete current[body.key];
  } else {
    current[body.key] = body.value;
  }

  await db
    .insert(customerAttributes)
    .values({
      userId,
      customFields: current,
      lastActivityAt: new Date(),
    })
    .onConflictDoUpdate({
      target: customerAttributes.userId,
      set: {
        customFields: current,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}
