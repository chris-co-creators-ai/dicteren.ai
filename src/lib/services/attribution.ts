// Dicteren.ai — Campagne-attributie per klant
//
// De capture zit al in <SourceCapture /> (marketing-layout): die schrijft
// gclid en utm_* naar de cookie dai_attrib zodra de bezoeker marketing-consent
// geeft. Deze service is de brug van die cookie naar een user-rij, zodat
// /admin/users kan tonen dat iemand via een advertentie binnenkwam.
//
// Aangeroepen op het moment dat de gebruiker echt bestaat (trial-claim);
// eerder hebben we geen user-id om aan te hangen.

import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { userAttribution } from "@/lib/db/schema";

/** Zelfde naam als in SourceCapture — één cookie, één waarheid. */
const COOKIE = "dai_attrib";

type Payload = Partial<
  Record<
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_term"
    | "utm_content"
    | "gclid"
    | "landing",
    string
  >
>;

function parse(raw: string | undefined): Payload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return null;
    const out: Payload = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.length > 0) {
        out[key as keyof Payload] = value.slice(0, 300);
      }
    }
    // Zonder campagne of click-id valt er niets toe te schrijven.
    if (!out.gclid && !out.utm_source && !out.utm_campaign) return null;
    return out;
  } catch {
    return null;
  }
}

/**
 * Leg vast met welke campagne deze gebruiker binnenkwam.
 *
 * Idempotent: bestaat er al een rij, dan blijft die staan. De eerste claim
 * wint, zodat een latere klik op een andere advertentie de oorspronkelijke
 * toeschrijving niet herschrijft.
 *
 * Faalt stil. Attributie mag nooit een trial-claim tegenhouden, en de tabel
 * bestaat pas zodra migratie 0056 is toegepast.
 */
export async function recordAttribution(userId: string): Promise<void> {
  try {
    const store = await cookies();
    const data = parse(store.get(COOKIE)?.value);
    if (!data) return;

    await db
      .insert(userAttribution)
      .values({
        userId,
        utmSource: data.utm_source ?? null,
        utmMedium: data.utm_medium ?? null,
        utmCampaign: data.utm_campaign ?? null,
        utmTerm: data.utm_term ?? null,
        utmContent: data.utm_content ?? null,
        gclid: data.gclid ?? null,
        landingPath: data.landing ?? null,
      })
      .onConflictDoNothing({ target: userAttribution.userId });
  } catch {
    // Tabel bestaat nog niet, cookie onleesbaar, of DB even weg: stil door.
  }
}
