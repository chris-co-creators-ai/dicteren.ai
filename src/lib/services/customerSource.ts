// Dicteren.ai — Customer source SSOT
//
// Eén bestand definieert hoe een klant bij ons binnenkwam, met label, kleur
// en icon-naam. Alle admin-lijsten (/users, /organizations, /crm) renderen
// hier doorheen via <SourceBadge />. Geen string-literals in de UI.
//
// Toevoegen van een bron = 1 regel hier + 1 case in deriveCustomerSource.

export type CustomerSourceKey =
  | "self_signup"
  | "trial"
  | "am_outreach"
  | "self_service"
  | "consumer_upgrade"
  | "affiliate"
  | "partner_activation"
  | "admin_grant"
  | "csv_import"
  | "lead_form"
  | "reseller_recruitment"
  | "signal_triggered";

export type CustomerSourceMeta = {
  label: string;
  /** Tailwind/brand color-token. Sluit aan op chip-classes elders. */
  color: "navy" | "aqua" | "orange" | "green" | "purple" | "gray" | "red";
  /** Lucide icon-naam — component importeert zelf. */
  icon:
    | "User"
    | "Clock"
    | "Phone"
    | "ShoppingCart"
    | "TrendingUp"
    | "Users"
    | "Heart"
    | "Gift"
    | "Upload"
    | "FileText"
    | "Zap";
};

export const CUSTOMER_SOURCE_BADGES: Record<CustomerSourceKey, CustomerSourceMeta> = {
  self_signup:        { label: "Self-signup",      color: "navy",   icon: "User" },
  trial:              { label: "Trial",            color: "aqua",   icon: "Clock" },
  am_outreach:        { label: "AM-outreach",      color: "orange", icon: "Phone" },
  self_service:       { label: "Self-service B2B", color: "navy",   icon: "ShoppingCart" },
  consumer_upgrade:   { label: "Upgrade naar B2B", color: "green",  icon: "TrendingUp" },
  affiliate:          { label: "Via reseller",     color: "purple", icon: "Users" },
  partner_activation: { label: "Partner-code",     color: "aqua",   icon: "Heart" },
  admin_grant:        { label: "Admin-grant",      color: "gray",   icon: "Gift" },
  csv_import:         { label: "CSV-import",       color: "gray",   icon: "Upload" },
  lead_form:          { label: "Lead-formulier",   color: "navy",   icon: "FileText" },
  reseller_recruitment: { label: "Reseller-werving", color: "purple", icon: "Users" },
  signal_triggered:   { label: "Via signaal",      color: "orange", icon: "Zap" },
};

export type CustomerSourceContext = {
  /** licenses.source: "self-signup" / "admin-grant" / "partner:..." / "affiliate:..." */
  licenseSource?: string | null;
  /** crm_organizations.source enum */
  crmOrgSource?:
    | "am_outreach"
    | "self_service"
    | "consumer_upgrade"
    | "csv_import"
    | "lead_form"
    | "reseller_recruitment"
    | null;
  /** licenses.type — bepaalt partner-activation en trial */
  licenseType?: "beta" | "consumer" | "team" | "partner" | null;
  /** Heeft user een affiliate-referral-rij? */
  hasAffiliateReferral?: boolean;
  /** Naam van de reseller voor tooltip-detail */
  affiliateName?: string | null;
  /** True als deze klant via een gerouteerd crm_signal binnenkwam.
   *  Zet caller op true wanneer een crm_org_task waar de klant uit
   *  voortkwam, was aangemaakt vanuit routeNewSignals. */
  signalTriggered?: boolean;
  /** Soort signaal voor tooltip (new_vacancy / promotion / etc.) */
  signalKind?: string | null;
};

/** Bepaal de canonical source-key voor een klant.
 *  Precedence: partner > affiliate > admin-grant > signal-triggered >
 *  crm-org-source > trial > self-signup. */
export function deriveCustomerSource(
  ctx: CustomerSourceContext,
): { key: CustomerSourceKey; detail: string | null } {
  if (ctx.licenseType === "partner") {
    return { key: "partner_activation", detail: null };
  }
  if (ctx.hasAffiliateReferral) {
    return { key: "affiliate", detail: ctx.affiliateName ?? null };
  }
  if (ctx.licenseSource === "admin-grant") {
    return { key: "admin_grant", detail: null };
  }
  if (ctx.signalTriggered) {
    return { key: "signal_triggered", detail: ctx.signalKind ?? null };
  }
  if (ctx.crmOrgSource) {
    return { key: ctx.crmOrgSource, detail: null };
  }
  if (ctx.licenseType === "beta") {
    return { key: "trial", detail: null };
  }
  return { key: "self_signup", detail: null };
}
