// Dicteren.ai — NL-adres-lookup (postcode + huisnummer → adres + provincie).
// Staff-only proxy naar de PDOK Locatieserver. GET ?postcode=&huisnummer=

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { lookupAddress } from "@/lib/services/pdok";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const postcode = url.searchParams.get("postcode") ?? "";
  const huisnummer = url.searchParams.get("huisnummer") ?? "";
  if (!postcode || !huisnummer) {
    return NextResponse.json(
      { success: false, error: "postcode + huisnummer verplicht" },
      { status: 400 },
    );
  }

  try {
    const address = await lookupAddress(postcode, huisnummer);
    if (!address) {
      return NextResponse.json({ success: false, error: "Geen adres gevonden" });
    }
    return NextResponse.json({ success: true, address });
  } catch {
    return NextResponse.json(
      { success: false, error: "Adres-service tijdelijk niet bereikbaar" },
      { status: 502 },
    );
  }
}
