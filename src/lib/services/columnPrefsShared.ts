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
  | "lists";

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
  accountOwner: "Account owner",
  discountCode: "Discount-code",
  lists: "Lijsten",
};

export type ColumnPrefs = {
  visibleColumns: ColumnKey[];
  columnOrder: ColumnKey[];
};
