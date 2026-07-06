// Dicteren.ai — instantly-reconcile cron
//
// Runs every 30 min (Vercel Cron, see vercel.json). Twee vangnetten voor de
// Instantly lifecycle bridge:
// 1. reprocessStuckInstantlyEvents — audit-rijen die na een crash op
//    processed_at NULL bleven hangen alsnog verwerken.
// 2. reconcileInstantlyWebhookEvents — Instantly retryt failed deliveries
//    maar 3x binnen 30s; alles daarbuiten via hun API ophalen en replayen.
//    Vereist INSTANTLY_API_KEY; zonder key rapporteert de run configured:false.
//
// Auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}`. Andere callers
// krijgen 401.

import { NextResponse } from "next/server";
import {
  reconcileInstantlyWebhookEvents,
  reprocessStuckInstantlyEvents,
} from "@/lib/services/instantlyWebhook";

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
    const reprocess = await reprocessStuckInstantlyEvents({ limit: 25 });
    const reconcile = await reconcileInstantlyWebhookEvents({
      lookbackHours: 6,
    });
    return NextResponse.json({
      success: true,
      reprocess,
      reconcile,
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
