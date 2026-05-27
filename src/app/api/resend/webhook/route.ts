// Dicteren.ai — Resend webhook
//
// Resend POSTs delivery events (delivered, bounced, complained, opened, etc.)
// here. We update email_logs.status so /admin/emails shows live status.
//
// Signing: Resend uses Svix headers (svix-id, svix-timestamp, svix-signature).
// Verify HMAC-SHA256 with RESEND_WEBHOOK_SECRET to reject forged requests.
//
// Set RESEND_WEBHOOK_SECRET in env to the value from Resend dashboard:
// Resend → Webhooks → <endpoint> → Signing Secret. Value starts with `whsec_`.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { message?: string; type?: string };
    failure?: { reason?: string };
  };
};

const TERMINAL_NEGATIVE = new Set(["bounced", "complained", "failed"]);

// Status-rang. Hogere rang overschrijft lagere — voorkomt dat een
// laat-aankomende `email.sent` event een eerder gearriveerde `delivered`
// status terugrolt. Negatieve statussen zijn terminal en raken niet
// overschreven door positieve.
const STATUS_RANK: Record<string, number> = {
  queued: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  // Negatieve statussen krijgen geen rang hier; ze worden via
  // TERMINAL_NEGATIVE-check afgevangen.
};

function mapStatus(eventType: string): {
  status: string | null;
  setDelivered: boolean;
} {
  switch (eventType) {
    case "email.sent":
      return { status: "sent", setDelivered: false };
    case "email.delivered":
      return { status: "delivered", setDelivered: true };
    case "email.opened":
      return { status: "opened", setDelivered: true };
    case "email.clicked":
      return { status: "clicked", setDelivered: true };
    case "email.bounced":
      return { status: "bounced", setDelivered: false };
    case "email.complained":
      return { status: "complained", setDelivered: false };
    case "email.failed":
      return { status: "failed", setDelivered: false };
    case "email.delivery_delayed":
      return { status: null, setDelivered: false }; // only touch lastEventAt
    default:
      return { status: null, setDelivered: false };
  }
}

function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  body: string,
  svixSignatureHeader: string,
): boolean {
  // Secret format: `whsec_<base64>`. Strip prefix and decode.
  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(keyB64, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;
  const expected = createHmac("sha256", keyBytes)
    .update(signedPayload)
    .digest("base64");

  // Header may contain multiple signatures: "v1,signA v1,signB"
  for (const part of svixSignatureHeader.split(" ")) {
    const [, sig] = part.split(",");
    if (!sig) continue;
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const body = await request.text();

  if (secret) {
    const svixId = request.headers.get("svix-id") ?? "";
    const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
    const svixSignature = request.headers.get("svix-signature") ?? "";

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing Svix headers" },
        { status: 400 },
      );
    }
    if (!verifySvixSignature(secret, svixId, svixTimestamp, body, svixSignature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ received: true, skipped: "no email_id" });
  }

  const mapped = mapStatus(event.type);
  const now = new Date();

  // Look up the row by Resend ID; if absent, this event references an email
  // we didn't send through our log path — log and ack.
  const [existing] = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.resendId, emailId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({
      received: true,
      skipped: "unknown email_id",
      emailId,
    });
  }

  // Status-update-regels:
  //   1. Terminal-negative (bounced/complained/failed) wordt nooit
  //      overschreven door een positieve status.
  //   2. Een laat-aankomende lagere positieve status (bv `sent` na
  //      `delivered`) overschrijft de hogere niet. Resend kan events
  //      out-of-order leveren.
  //   3. Negatieve statussen overschrijven elk positief — bounce na
  //      delivered wint.
  const updates: Partial<typeof emailLogs.$inferInsert> = { lastEventAt: now };
  if (mapped.status) {
    const newIsNegative = TERMINAL_NEGATIVE.has(mapped.status);
    const oldIsNegative = TERMINAL_NEGATIVE.has(existing.status);
    if (oldIsNegative && !newIsNegative) {
      // Skip: positieve mag terminal-negative niet overschrijven.
    } else if (!newIsNegative && !oldIsNegative) {
      // Beide positief: hoogste rang wint.
      const newRank = STATUS_RANK[mapped.status] ?? 0;
      const oldRank = STATUS_RANK[existing.status] ?? 0;
      if (newRank >= oldRank) {
        updates.status = mapped.status as typeof existing.status;
      }
    } else {
      // Nieuwe is negative, oude is positief (of beide negative) → overwrite.
      updates.status = mapped.status as typeof existing.status;
    }
  }
  if (mapped.setDelivered && !existing.deliveredAt) {
    updates.deliveredAt = now;
  }
  if (event.type === "email.bounced" && event.data?.bounce?.message) {
    updates.errorMessage = event.data.bounce.message;
    updates.errorCode = event.data.bounce.type ?? "BOUNCE";
  }
  if (event.type === "email.failed" && event.data?.failure?.reason) {
    updates.errorMessage = event.data.failure.reason;
    updates.errorCode = "FAILED";
  }

  await db.update(emailLogs).set(updates).where(eq(emailLogs.id, existing.id));

  return NextResponse.json({
    received: true,
    type: event.type,
    status: updates.status ?? existing.status,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "resend-webhook" });
}
