// Self-serve referral-aanmelding (PRD self-serve-referral, Fase 3).
// Publiek, geen login: e-mail erin → affiliate met de vaste preset → de deelbare
// link `/r/{code}` eruit. Idempotent op e-mail (dezelfde aanvraag = zelfde link).
// De welkomstmail (Fase 4) wordt hier getriggerd zodra de copy is goedgekeurd.

import { NextResponse } from "next/server";
import { createSelfServeAffiliate } from "@/lib/services/affiliate";
import { isDisposableEmail } from "@/lib/services/emailNormalize";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { emailBase } from "@/lib/url";

export async function POST(request: Request) {
  const blocked = await enforceRateLimit(request, "referral:join");
  if (blocked) return blocked;

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige aanvraag" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim();
  if (!email.includes("@") || email.length < 5) {
    return NextResponse.json(
      { success: false, error: "Vul een geldig e-mailadres in." },
      { status: 400 },
    );
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Gebruik je werk- of persoonlijke e-mailadres." },
      { status: 422 },
    );
  }

  const { affiliate } = await createSelfServeAffiliate({
    email,
    name: body.name ?? null,
  });
  const link = `${emailBase()}/r/${affiliate.code}`;

  // TODO Fase 4: welkomstmail met `link` versturen (copy-gated).
  return NextResponse.json({
    success: true,
    data: { code: affiliate.code, link },
  });
}
