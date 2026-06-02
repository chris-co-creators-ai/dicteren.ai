// Dicteren.ai — De 12 Nederlandse provincies (client-safe constante).
// Exacte spelling = PDOK's `provincienaam`, zodat de adres-lookup 1-op-1 mapt
// naar de dropdown-waarde zonder normalisatie.

export const NL_PROVINCES = [
  "Drenthe",
  "Flevoland",
  "Friesland",
  "Gelderland",
  "Groningen",
  "Limburg",
  "Noord-Brabant",
  "Noord-Holland",
  "Overijssel",
  "Utrecht",
  "Zeeland",
  "Zuid-Holland",
] as const;

export type NlProvince = (typeof NL_PROVINCES)[number];

/** PDOK levert "Fryslân"; wij tonen "Friesland". Normaliseer naar onze set. */
export function normalizeProvince(raw: string | null | undefined): NlProvince | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v === "Fryslân") return "Friesland";
  return (NL_PROVINCES as readonly string[]).includes(v)
    ? (v as NlProvince)
    : null;
}
