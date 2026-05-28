// Dicteren.ai — route-signals cron
//
// Runs every 15 min (Vercel Cron, see vercel.json). Pakt status='new'
// signals (hoogste score eerst), maakt voor elk een crm_org_task aan
// op de account-owner van de org, flipt status='actioned'.
//
// Auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}`. Andere callers
// krijgen 401. Set CRON_SECRET in Vercel env.

import { NextResponse } from "next/server";
import { routeNewSignals } from "@/lib/services/signals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await routeNewSignals({ limit: 50 });
    return NextResponse.json({
      success: true,
      routed: result.routed,
      skipped: result.skipped,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = (err as Error).message;
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
