import "server-only";
import { normalizeProvince, type NlProvince } from "./nlProvinces";

// Dicteren.ai — NL-adres-lookup via de PDOK Locatieserver (Kadaster/overheid).
// Gratis, geen API-key, EU-gehost (AVG-proof). Postcode + huisnummer → volledig
// adres + provincie + coördinaten. Geen npm-dependency: directe HTTP.
//
// Geverifieerd live: q=postcode:{PC} and huisnummer:{NR} + fq=type:adres geeft
// straatnaam/woonplaatsnaam/gemeentenaam/provincienaam/centroide_ll terug.

const BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";

export type AddressLookup = {
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  municipality: string | null;
  province: NlProvince | null;
  lat: number | null;
  lon: number | null;
  displayName: string | null;
};

type PdokDoc = {
  straatnaam?: string;
  huisnummer?: number;
  postcode?: string;
  woonplaatsnaam?: string;
  gemeentenaam?: string;
  provincienaam?: string;
  centroide_ll?: string; // "POINT(lon lat)"
  weergavenaam?: string;
};

function parsePoint(p?: string): { lat: number | null; lon: number | null } {
  if (!p) return { lat: null, lon: null };
  const m = p.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!m) return { lat: null, lon: null };
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

/** Normaliseer een NL-postcode naar "1234AB" (geen spaties, hoofdletters). */
export function normalizePostcode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Zoek het adres bij postcode + huisnummer. Geeft null als er geen match is
 * (niet elk postcode+huisnummer bestaat). Gooit alleen bij een netwerk/HTTP-fout.
 */
export async function lookupAddress(
  postcode: string,
  houseNumber: string,
): Promise<AddressLookup | null> {
  const pc = normalizePostcode(postcode);
  const nr = houseNumber.trim();
  if (!/^[1-9][0-9]{3}[A-Z]{2}$/.test(pc) || !nr) return null;

  const q = `postcode:${pc} and huisnummer:${nr}`;
  const url =
    `${BASE}?q=${encodeURIComponent(q)}&fq=type:adres&rows=1` +
    `&fl=weergavenaam,straatnaam,huisnummer,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`pdok ${res.status}`);
  const data = (await res.json()) as { response?: { docs?: PdokDoc[] } };
  const doc = data.response?.docs?.[0];
  if (!doc) return null;

  const { lat, lon } = parsePoint(doc.centroide_ll);
  return {
    street: doc.straatnaam ?? null,
    houseNumber: doc.huisnummer != null ? String(doc.huisnummer) : nr,
    postalCode: doc.postcode ?? pc,
    city: doc.woonplaatsnaam ?? null,
    municipality: doc.gemeentenaam ?? null,
    province: normalizeProvince(doc.provincienaam),
    lat,
    lon,
    displayName: doc.weergavenaam ?? null,
  };
}
