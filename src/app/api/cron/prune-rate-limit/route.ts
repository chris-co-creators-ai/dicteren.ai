// Dicteren.ai — Daily prune van rate_limit_events
//
// Verwijdert events ouder dan 24u zodat de tabel niet ongelimiteerd
// groeit. Onze grootste window in RATE_LIMITS is 86_400s (license:trial),
// dus 24u retention dekt alle check-windows.
//
// Auth: Vercel zet `Authorization: Bearer ${CRON_SECRET}`. Geen secret →
// 401. Schedule in vercel.json.

import { NextResponse } from "next/server";
import { pruneRateLimitEvents } from "@/lib/services";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await pruneRateLimitEvents(86_400);
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
