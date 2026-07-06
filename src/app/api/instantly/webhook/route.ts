import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { processInstantlyWebhookPayload } from "@/lib/services/instantlyWebhook";

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/instantly/webhook",
    configured: Boolean(process.env.INSTANTLY_WEBHOOK_SECRET),
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.INSTANTLY_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { received: false, error: "INSTANTLY_WEBHOOK_SECRET is not configured" },
      { status: 503 },
    );
  }

  const limited = await enforceRateLimit(request, "instantly:webhook");
  if (limited) return limited;

  const providedSecret = request.headers.get("x-instantly-secret") ?? "";
  if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return NextResponse.json(
      { received: false, error: "Invalid Instantly webhook secret" },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { received: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const result = await processInstantlyWebhookPayload(payload, rawBody);
  return NextResponse.json(result);
}
