// Dicteren.ai — Client-safe types/constants voor CRM-kolommen.
// columnPrefs.ts heeft "server-only" import en kan niet vanuit een client
// component gebruikt worden — daarom split-file met de types die zowel
// server- als client-code nodig heeft.

export type ColumnKey =
  | "customer"
  | "stage"
  | "temperature"
  | "assignee"
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
  | "leadScore";

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "customer",
  "stage",
  "temperature",
  "assignee",
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
];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  customer: "Klant",
  stage: "Stage",
  temperature: "Temperatuur",
  assignee: "Account manager",
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
};

export const COLUMN_MIN_WIDTH = 60;
export const COLUMN_MAX_WIDTH = 600;
