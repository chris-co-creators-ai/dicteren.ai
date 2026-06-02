// Dicteren.ai — Controlled vocabulary voor branche (NL MKB-targeting).
// Vaste set i.p.v. vrije tekst zodat analytics/segmentatie betrouwbaar zijn
// (geen "Advocaten" vs "advocatuur" vs "juridisch" rommel). Dicteer-relevante
// beroepen (veel tekst/dictaat) bovenaan, daarna brede MKB-dekking.
//
// Pas deze lijst aan als de ICP-targeting verandert; het is de single source
// voor de branche-dropdown in het CRM, het verrijking-panel en de filter.

export const MKB_BRANCHES = [
  // Tekst-/dictaat-intensief (kern-ICP voor Dicteren)
  "Advocatuur",
  "Notariaat",
  "Accountancy & boekhouding",
  "Belastingadvies",
  "Juridisch — overig",
  "Zorg — huisartsen",
  "Zorg — tandartsen",
  "Zorg — medisch specialisten/klinieken",
  "Zorg — paramedisch (fysio/ergo)",
  "Geestelijke gezondheidszorg",
  "Veterinair",
  "Consultancy & advies",
  "Financieel advies & hypotheken",
  "Verzekeringen",
  "Makelaardij & vastgoed",
  "Recruitment & werving",
  "HR & payroll",
  // Bredere MKB-dekking
  "Marketing & reclamebureau",
  "Media & communicatie",
  "E-commerce & retail",
  "IT & software",
  "Bouw & installatie",
  "Architectuur & engineering",
  "Logistiek & transport",
  "Productie & industrie",
  "Groothandel",
  "Horeca",
  "Onderwijs & opleiding",
  "Schoonheid & wellness",
  "Automotive",
  "Energie & duurzaamheid",
  "Agrarisch",
  "Overheid & non-profit",
  "Vereniging & stichting",
  "Overig",
] as const;

export type MkbBranche = (typeof MKB_BRANCHES)[number];
