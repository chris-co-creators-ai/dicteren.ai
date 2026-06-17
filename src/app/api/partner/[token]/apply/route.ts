// Dicteren.ai — Publiek: aanmelding op de deck-pagina (reseller-funnel).
// "Ja, ik wil partner worden" → de prospect levert bedrijf + quote aan. Dit zet
// de lead op "Aangemeld" + een taak voor de AM (in markApplied). De AM beoordeelt
// en beslist; een aanmelding maakt nog geen reseller (de grens ligt bij de promote).

import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import {
  getContactByDeckToken,
  markApplied,
} from "@/lib/services/partnerFunnel";

type Params = Promise<{ token: string }>;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const blocked = await enforceRateLimit(request, "partner:apply");
  if (blocked) return blocked;
  const { token } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige aanvraag" },
      { status: 400 },
    );
  }

  // Honeypot: bots vullen verborgen velden. Stil success, geen lead.
  if (typeof body.website2 === "string" && body.website2.trim() !== "") {
    return NextResponse.json({ success: true });
  }

  const contact = await getContactByDeckToken(token);
  if (!contact) {
    return NextResponse.json(
      { success: false, error: "Pagina niet gevonden" },
      { status: 404 },
    );
  }

  // Consent verplicht (AVG): contact + gebruik van logo/quote.
  if (body.consent !== true) {
    return NextResponse.json(
      { success: false, error: "Geef akkoord om verder te gaan" },
      { status: 400 },
    );
  }

  await markApplied(contact.id, {
    companyName: clean(body.companyName, 200),
    quote: clean(body.quote, 600),
    quoteAuthor: clean(body.quoteAuthor, 120),
    logoR2Key: null, // logo-upload volgt in een aparte stap
  });

  return NextResponse.json({ success: true });
}
