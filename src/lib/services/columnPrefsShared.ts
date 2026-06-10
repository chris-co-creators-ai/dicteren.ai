// Dicteren.ai — Client-safe types/constants voor CRM-kolommen.
// columnPrefs.ts heeft "server-only" import en kan niet vanuit een client
// component gebruikt worden — daarom split-file met de types die zowel
// server- als client-code nodig heeft.

export type ColumnKey =
  | "customer"
  | "email"
  | "phone"
  | "contactFirstName"
  | "contactLastName"
  | "contactRole"
  | "contactMobile"
  | "orgKvk"
  | "orgVatNumber"
  | "orgBrancheVereniging"
  | "orgAantalVestigingen"
  | "orgHoofdkantoor"
  | "orgSpecialisatie"
  | "stage"
  | "temperature"
  | "assignee"
  | "action"
  | "disposition"
  | "nextAction"
  | "segment"
  | "trial"
  | "mollie"
  | "discount"
  | "mails"
  | "licenses"
  | "memberSince"
  | "accountOwner"
  | "discountCode"
  | "lists"
  | "niche"
  | "industry"
  | "companySize"
  | "reach"
  | "leadScore"
  | "jobTitle"
  | "seniority"
  | "city"
  | "companyName"
  | "companyDomain"
  | "linkedinUrl"
  | "revenueRange";

// Bel-set: past zonder horizontale scroll op een 1440-scherm (container
// ±1150px incl. checkbox- en actie-kolom). De Klant-kolom toont bij prospects
// al het bedrijf; temperatuur en de klant-economie-kolommen zitten in de
// Klantbeheer-preset.
export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "customer",
  "city",
  "email",
  "phone",
  // Contactpersoon-cluster rechts van Telefoon (verzoek Christian 2026-06-10).
  // De belronde is hiermee breder dan één scherm; bewuste keuze: volledige
  // contactdata weegt zwaarder dan scroll-vrij.
  "contactFirstName",
  "contactLastName",
  "contactRole",
  "contactMobile",
  "stage",
  "assignee",
  "action",
  "disposition",
  "nextAction",
];

// Strakkere breedtes voor de belronde zodat de 9 kolommen samen onder de
// ±1036px datakolom-ruimte van een 1440-scherm blijven.
export const BELRONDE_WIDTHS: Partial<Record<ColumnKey, number>> = {
  customer: 173,
  city: 80,
  email: 145,
  phone: 105,
  contactFirstName: 100,
  contactLastName: 110,
  contactRole: 130,
  contactMobile: 110,
  stage: 95,
  assignee: 100,
  action: 115,
  disposition: 100,
  nextAction: 120,
};

export type ColumnPresetKey = "belronde" | "klantbeheer" | "alles";

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  customer: "Klant",
  email: "E-mail",
  phone: "Telefoon",
  contactFirstName: "Voornaam",
  contactLastName: "Achternaam",
  contactRole: "Functietitel",
  contactMobile: "Mobiel",
  orgKvk: "KvK",
  orgVatNumber: "BTW-nummer",
  orgBrancheVereniging: "Branchevereniging",
  orgAantalVestigingen: "Vestigingen",
  orgHoofdkantoor: "Hoofdkantoor",
  orgSpecialisatie: "Specialisatie",
  stage: "Stage",
  temperature: "Temperatuur",
  assignee: "Account manager",
  action: "Actie",
  disposition: "Laatste contact",
  nextAction: "Volgende actie",
  segment: "Segment",
  trial: "Trial",
  mollie: "Mollie",
  discount: "Korting / bron",
  mails: "Mails",
  licenses: "Lic.",
  memberSince: "Lid sinds",
  accountOwner: "Reseller",
  discountCode: "Discount-code",
  lists: "Lijsten",
  niche: "Niche",
  industry: "Branche",
  companySize: "Bedrijfsgrootte",
  reach: "Bereik",
  leadScore: "Score",
  jobTitle: "Functietitel",
  seniority: "Senioriteit",
  city: "Stad",
  companyName: "Bedrijfsnaam",
  companyDomain: "Domein",
  linkedinUrl: "LinkedIn",
  revenueRange: "Omzet",
};

// View-presets: één klik wisselt de zichtbare kolommen. Schrijft naar dezelfde
// per-user column-prefs als de kolom-manager. "alles" is afgeleid uit het
// exhaustieve COLUMN_LABELS-record, zodat een nieuwe ColumnKey er automatisch
// in zit (de compiler dwingt COLUMN_LABELS-volledigheid al af).
export const COLUMN_PRESETS: Record<
  ColumnPresetKey,
  { label: string; columns: ColumnKey[]; widths?: Partial<Record<ColumnKey, number>> }
> = {
  belronde: {
    label: "Belronde",
    columns: DEFAULT_VISIBLE_COLUMNS,
    widths: BELRONDE_WIDTHS,
  },
  klantbeheer: {
    label: "Klantbeheer",
    columns: [
      "customer",
      "stage",
      "temperature",
      "assignee",
      "action",
      "disposition",
      "nextAction",
      "segment",
      "trial",
      "mollie",
      "discount",
      "mails",
      "licenses",
      "memberSince",
      "accountOwner",
      "discountCode",
      "lists",
    ],
  },
  alles: {
    label: "Alles",
    columns: Object.keys(COLUMN_LABELS) as ColumnKey[],
  },
};

export type ColumnPrefs = {
  visibleColumns: ColumnKey[];
  columnOrder: ColumnKey[];
  /** Per-kolom breedte in px (key = ColumnKey of "custom:..."); leeg = default. */
  columnWidths?: Record<string, number>;
};

/** Default kolombreedtes (px) waar geen user-override bestaat. */
export const DEFAULT_COLUMN_WIDTH = 150;
export const COLUMN_WIDTH_DEFAULTS: Record<string, number> = {
  customer: 240,
  email: 170,
  phone: 120,
  contactFirstName: 110,
  contactLastName: 120,
  contactRole: 150,
  contactMobile: 120,
  orgKvk: 110,
  orgVatNumber: 140,
  orgBrancheVereniging: 150,
  orgAantalVestigingen: 100,
  orgHoofdkantoor: 140,
  orgSpecialisatie: 160,
  stage: 130,
  temperature: 120,
  assignee: 150,
  action: 140,
  disposition: 150,
  nextAction: 180,
  segment: 110,
  trial: 130,
  mollie: 120,
  discount: 140,
  mails: 110,
  licenses: 70,
  memberSince: 110,
  accountOwner: 150,
  discountCode: 130,
  lists: 160,
  niche: 150,
  industry: 150,
  companySize: 130,
  reach: 90,
  leadScore: 90,
  jobTitle: 170,
  seniority: 110,
  city: 120,
  companyName: 170,
  companyDomain: 160,
  linkedinUrl: 160,
  revenueRange: 130,
};

export const COLUMN_MIN_WIDTH = 60;
export const COLUMN_MAX_WIDTH = 600;
