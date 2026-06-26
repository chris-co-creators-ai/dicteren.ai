// Gedeelde CRM-enums. Leaf-module zonder table-imports zodat crm.ts en
// crmDeals.ts beide hieruit kunnen putten zonder elkaar circulair te
// importeren (crm.ts heeft crmContacts uit crmDeals nodig voor de polymorfe
// lead_list_members).

import { pgEnum } from "drizzle-orm/pg-core";

export const customerStage = pgEnum("customer_stage", [
  "lead",
  "prospect",
  "mql",
  "sql",
  "customer",
  "lost",
  "churned",
  "reseller",
]);

export const customerTemperature = pgEnum("customer_temperature", [
  "cold",
  "lukewarm",
  "warm",
  "hot",
]);

export const listColor = pgEnum("list_color", [
  "blue",
  "green",
  "orange",
  "red",
  "purple",
  "gray",
  "navy",
  "aqua",
]);

// Funnel-discriminator. Splitst eindklant-werving van reseller-werving zodat het
// bord, het side-panel en de funnel-cijfers per spoor zuiver blijven. Leeft op
// crm_contacts (de waarheid) én op lead_lists (de ingang/default). Migratie 0052.
export const prospectType = pgEnum("prospect_type", ["eindklant", "reseller"]);

export const listType = pgEnum("list_type", ["eindklant", "reseller"]);
