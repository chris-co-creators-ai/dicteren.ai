// Vrienden uitnodigen — een uitnodigingscode toepassen (PRD vrienden-uitnodigen, Fase 5).
// De ingelogde gebruiker (= de aangebrachte) voert een code in. Koppelt hem aan de
// aanbrenger + kent z'n gratis maand toe. First-touch: kan niet als er al een is.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import {
  getReferrerByCode,
  getReferralByReferred,
  attributeReferral,
} from "@/lib/services/referral";

export async function POST(request: Request) {
  const blocked = await enforceRateLimit(request, "referral:join");
  if (blocked) return blocked;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Log eerst in." },
      { status: 401 },
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ success: false, error: "Vul een code in." }, { status: 400 });
  }

  const existing = await getReferralByReferred(session.user.id);
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Je hebt al een uitnodiging gebruikt." },
      { status: 409 },
    );
  }

  const referrerUserId = await getReferrerByCode(code);
  if (!referrerUserId) {
    return NextResponse.json(
      { success: false, error: "Deze code bestaat niet." },
      { status: 404 },
    );
  }
  if (referrerUserId === session.user.id) {
    return NextResponse.json(
      { success: false, error: "Je kunt je eigen code niet gebruiken." },
      { status: 422 },
    );
  }

  const result = await attributeReferral({
    referrerUserId,
    referredUserId: session.user.id,
    referredEmail: session.user.email,
    referrerCode: code.toUpperCase(),
    source: "code",
  });

  if (!result.created) {
    return NextResponse.json(
      { success: false, error: "Kon de code niet toepassen." },
      { status: 409 },
    );
  }
  return NextResponse.json({ success: true });
}
