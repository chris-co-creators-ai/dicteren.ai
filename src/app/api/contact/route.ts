// Dicteren.ai — Publiek contact-formulier endpoint.
//
// Rate-limit: max 5 berichten / 10 min per IP. Validation server-side
// (length-caps + email-regex) zodat we niet vertrouwen op de client.
// IP wordt SHA-256 gehasht voor opslag (GDPR).

import { NextResponse } from "next/server";
import {
  createContactMessage,
  enforceRateLimit,
  getClientIp,
  hashIp,
  type ContactMessageKind,
} from "@/lib/services";
import type { RateLimitBucket } from "@/lib/services/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME = 200;
const MAX_EMAIL = 200;
const MAX_COMPANY = 200;
const MAX_PHONE = 50;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 8000;

function sanitize(input: string | undefined | null, max: number): string {
  if (!input) return "";
  return String(input).trim().slice(0, max);
}

const ALLOWED_KINDS: ContactMessageKind[] = [
  "general",
  "sales",
  "support",
  "partnership",
  "quote_request",
];

export async function POST(request: Request) {
  let body: {
    kind?: string;
    name?: string;
    email?: string;
    company?: string | null;
    phone?: string | null;
    subject?: string | null;
    message?: string;
    metadata?: Record<string, unknown> | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  // Honeypot: als deze field gevuld is = bot.
  if (
    body.metadata &&
    typeof body.metadata === "object" &&
    "website" in body.metadata &&
    body.metadata.website
  ) {
    // Silently accept (geef bot een "success" terug zonder DB-write).
    return NextResponse.json({ success: true });
  }

  const name = sanitize(body.name, MAX_NAME);
  const email = sanitize(body.email, MAX_EMAIL).toLowerCase();
  const message = sanitize(body.message, MAX_MESSAGE);

  if (!name || !email || !message) {
    return NextResponse.json(
      { success: false, error: "Naam, e-mail en bericht zijn verplicht." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig e-mailadres." },
      { status: 400 },
    );
  }
  if (message.length < 10) {
    return NextResponse.json(
      { success: false, error: "Bericht is te kort (min. 10 tekens)." },
      { status: 400 },
    );
  }

  const kind: ContactMessageKind =
    body.kind && ALLOWED_KINDS.includes(body.kind as ContactMessageKind)
      ? (body.kind as ContactMessageKind)
      : "general";

  const ipHash = hashIp(getClientIp(request));

  const blocked = await enforceRateLimit(
    request,
    `contact:${kind}` as RateLimitBucket,
  );
  if (blocked) return blocked;

  const safeMetadata =
    body.metadata && typeof body.metadata === "object"
      ? Object.fromEntries(
          Object.entries(body.metadata)
            .filter(([k]) => k !== "website")
            .slice(0, 30)
            .map(([k, v]) => [
              String(k).slice(0, 80),
              typeof v === "string"
                ? v.slice(0, 500)
                : typeof v === "number"
                  ? v
                  : null,
            ]),
        )
      : null;

  const created = await createContactMessage({
    kind,
    name,
    email,
    company: sanitize(body.company, MAX_COMPANY) || null,
    phone: sanitize(body.phone, MAX_PHONE) || null,
    subject: sanitize(body.subject, MAX_SUBJECT) || null,
    message,
    metadata: safeMetadata,
    ipHash,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });

  return NextResponse.json({ success: true, id: created.id });
}
