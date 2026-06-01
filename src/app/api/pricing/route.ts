// Dicteren.ai — Publieke prijs-config (read-only).
//
// Prijzen zijn publiek (staan op /prijzen). Dit endpoint levert de actuele
// staffel + premies aan client-tools (admin mini-calculator) zonder dat die
// de server-only DB-loader hoeven te importeren.

import { NextResponse } from "next/server";
import { getPricing } from "@/lib/services/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const pricing = await getPricing();
  return NextResponse.json({ success: true, data: pricing });
}
