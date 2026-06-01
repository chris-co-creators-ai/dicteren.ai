// Dicteren.ai — Zet de first-touch affiliate-attributie-cookie.
//
// Apart endpoint omdat Next 16 cookies().set() alleen in een route-handler /
// server-action toestaat, niet tijdens een page-render. De /[slug]-landing
// roept dit client-side aan. Valideert dat de affiliate bestaat + actief is.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { setRefCookie } from "@/lib/affiliateCookie";
import { enforceRateLimit } from "@/lib/services/rateLimit";

export async function POST(request: Request) {
  const blocked = await enforceRateLimit(request, "affiliate:ref");
  if (blocked) return blocked;

  let body: { affiliateId?: string; source?: "slug" | "url-ref" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  if (!body.affiliateId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // Alleen een bestaande, actieve affiliate mag een cookie zetten.
  const [aff] = await db
    .select({ id: affiliates.id, status: affiliates.status })
    .from(affiliates)
    .where(eq(affiliates.id, body.affiliateId))
    .limit(1);
  if (!aff || aff.status !== "active") {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  await setRefCookie({
    affiliateId: aff.id,
    source: body.source === "url-ref" ? "url-ref" : "slug",
  });
  return NextResponse.json({ success: true });
}
