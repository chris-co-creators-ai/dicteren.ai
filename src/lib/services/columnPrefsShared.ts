// Dicteren.ai — Client-safe types/constants voor CRM-kolommen.
// columnPrefs.ts heeft "server-only" import en kan niet vanuit een client
// component gebruikt worden — daarom split-file met de types die zowel
// server- als client-code nodig heeft.

export type ColumnKey =
  | "customer"
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
  "stage",
  "assignee",
  "action",
  "disposition",
  "nextAction",
];

// Strakkere breedtes voor de belronde zodat de 7 kolommen samen onder de
// ±1036px datakolom-ruimte van een 1440-scherm blijven.
export const BELRONDE_WIDTHS: Record<string, number> = {
  customer: 220,
  city: 100,
  stage: 110,
  assignee: 120,
  action: 140,
  disposition: 130,
  nextAction: 150,
};

// View-presets: één klik wisselt de zichtbare kolommen. Schrijft naar dezelfde
// per-user column-prefs als de kolom-manager.
export type ColumnPresetKey = "belronde" | "klantbeheer" | "alles";

export const COLUMN_PRESETS: Record<
  ColumnPresetKey,
  { label: string; columns: ColumnKey[]; widths?: Record<string, number> }
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
      "niche",
      "industry",
      "companySize",
      "reach",
      "leadScore",
      "jobTitle",
      "seniority",
      "city",
      "companyName",
      "companyDomain",
      "linkedinUrl",
      "revenueRange",
    ],
  },
};

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  customer: "Klant",
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
