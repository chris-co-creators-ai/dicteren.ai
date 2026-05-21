export type KpiTrend = "up" | "down" | "flat";

export type Kpi = {
  label: string;
  value: string;
  delta: string;
  trend: KpiTrend;
  demo?: boolean;
};

export const OVERVIEW_KPIS: Kpi[] = [
  { label: "Actieve licenties", value: "142", delta: "+12 dz. wk", trend: "up" },
  { label: "Beta-codes uitgegeven", value: "418", delta: "36% benut", trend: "flat" },
  { label: "Activaties vandaag", value: "23", delta: "+5 vs gem.", trend: "up" },
  { label: "Model-downloads voltooid", value: "139", delta: "98% slagingspercentage", trend: "flat" },
  { label: "Omzet (demo)", value: "€8.412", delta: "placeholder · niet definitief", trend: "flat", demo: true },
  { label: "Open support-tickets", value: "7", delta: "2 langer dan 24u", trend: "down" },
];

export type ActivityItem = {
  id: string;
  type: "license" | "model" | "request" | "ticket" | "invoice";
  title: string;
  detail: string;
  detailMono?: boolean;
  ago: string;
};

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "a-001",
    type: "license",
    title: "Nieuwe beta-code geactiveerd",
    detail: "lisa.veenstra@boomadvocaten.nl · DIC-BETA-2026-K7MJ-Q9RA",
    detailMono: true,
    ago: "2 min geleden",
  },
  {
    id: "a-002",
    type: "model",
    title: "Model-installatie voltooid",
    detail: "macOS · Apple Silicon · 4,2s",
    ago: "14 min geleden",
  },
  {
    id: "a-003",
    type: "request",
    title: "Zakelijke aanvraag binnengekomen",
    detail: "Praktijk Vermeer · 6 zitplaatsen",
    ago: "1 u geleden",
  },
  {
    id: "a-004",
    type: "ticket",
    title: "Support-ticket geopend",
    detail: '#48 · "microfoon niet gevonden Windows 11"',
    ago: "2 u geleden",
  },
  {
    id: "a-005",
    type: "invoice",
    title: "Factuur betaald",
    detail: "€96 · jaarlicentie · Mostafa A.",
    ago: "3 u geleden",
  },
];

export type LicenseDistribution = {
  label: string;
  pct: number;
  color: string;
};

export const LICENSE_DISTRIBUTION: LicenseDistribution[] = [
  { label: "Beta (gratis)", pct: 64, color: "var(--aqua)" },
  { label: "Persoonlijk", pct: 22, color: "var(--orange)" },
  { label: "Zakelijk", pct: 14, color: "var(--navy)" },
];

export type LicenseStatus = "unused" | "active" | "expired" | "revoked";

export type License = {
  id: string;
  code: string;
  type: "beta" | "pro" | "team";
  status: LicenseStatus;
  email?: string;
  organization?: string;
  activations: number;
  maxActivations: number;
  issuedAt: string;
  expiresAt: string;
};

export const MOCK_LICENSES: License[] = [
  {
    id: "lic-001",
    code: "DIC-BETA-2026-K7MJ-Q9RA",
    type: "beta",
    status: "active",
    email: "lisa.veenstra@boomadvocaten.nl",
    organization: "Boom Advocaten",
    activations: 1,
    maxActivations: 2,
    issuedAt: "2026-05-12",
    expiresAt: "2026-08-10",
  },
  {
    id: "lic-002",
    code: "DIC-BETA-2026-X8PR-T2NM",
    type: "beta",
    status: "unused",
    email: "info@praktijkvermeer.nl",
    organization: "Praktijk Vermeer",
    activations: 0,
    maxActivations: 2,
    issuedAt: "2026-05-18",
    expiresAt: "2026-08-16",
  },
  {
    id: "lic-003",
    code: "DIC-PRO-2026-9HMK-LR4Q",
    type: "pro",
    status: "active",
    email: "mostafa.a@example.com",
    activations: 2,
    maxActivations: 2,
    issuedAt: "2026-05-08",
    expiresAt: "2027-05-08",
  },
  {
    id: "lic-004",
    code: "DIC-TEAM-2026-VB12-N7RT",
    type: "team",
    status: "active",
    email: "admin@zorggroep-utrecht.nl",
    organization: "Zorggroep Utrecht",
    activations: 8,
    maxActivations: 14,
    issuedAt: "2026-04-22",
    expiresAt: "2027-04-22",
  },
  {
    id: "lic-005",
    code: "DIC-BETA-2026-AAAA-BBBB",
    type: "beta",
    status: "expired",
    email: "tester@example.com",
    activations: 2,
    maxActivations: 2,
    issuedAt: "2026-01-10",
    expiresAt: "2026-04-10",
  },
  {
    id: "lic-006",
    code: "DIC-BETA-2026-RVKD-9001",
    type: "beta",
    status: "revoked",
    email: "spam-bot@example.com",
    activations: 0,
    maxActivations: 2,
    issuedAt: "2026-02-14",
    expiresAt: "2026-05-15",
  },
];

export const ACTIVATIONS_14D: number[] = [
  18, 21, 14, 24, 22, 27, 25, 31, 29, 36, 33, 41, 38, 45,
];

// ─────────────────────────── CRM ───────────────────────────

export type CustomerStatus = "trial" | "active" | "churned" | "lead";
export type CustomerType = "consumer" | "organization";

export type Customer = {
  id: string;
  name: string;
  email: string;
  type: CustomerType;
  organization?: string;
  licenseCount: number;
  status: CustomerStatus;
  lastActivity: string;
  signedUpAt: string;
  notes?: string;
};

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "c-001", name: "Lisa Veenstra", email: "lisa.veenstra@boomadvocaten.nl", type: "organization", organization: "Boom Advocaten", licenseCount: 1, status: "active", lastActivity: "2 min geleden", signedUpAt: "12 mei 2026" },
  { id: "c-002", name: "Mostafa Amrani", email: "mostafa.a@gmail.com", type: "consumer", licenseCount: 1, status: "active", lastActivity: "1 u geleden", signedUpAt: "8 mei 2026" },
  { id: "c-003", name: "Praktijk Vermeer", email: "admin@praktijk-vermeer.nl", type: "organization", organization: "Praktijk Vermeer", licenseCount: 6, status: "active", lastActivity: "Vandaag", signedUpAt: "12 apr 2026" },
  { id: "c-004", name: "Wouter Kessels", email: "wouter@kessels-consult.nl", type: "consumer", licenseCount: 1, status: "trial", lastActivity: "4 dagen", signedUpAt: "4 mei 2026" },
  { id: "c-005", name: "Noor Mansouri", email: "noor.m@studio-noor.nl", type: "consumer", licenseCount: 1, status: "churned", lastActivity: "30 dagen", signedUpAt: "18 jan 2026" },
  { id: "c-006", name: "Zorggroep Utrecht", email: "ict@zorggroep-utrecht.nl", type: "organization", organization: "Zorggroep Utrecht", licenseCount: 14, status: "active", lastActivity: "5 min geleden", signedUpAt: "22 apr 2026" },
  { id: "c-007", name: "Pim Bakker", email: "p.bakker@de-bakker-makelaars.nl", type: "organization", organization: "De Bakker Makelaars", licenseCount: 4, status: "active", lastActivity: "Gisteren", signedUpAt: "15 mrt 2026" },
  { id: "c-008", name: "Sanne de Vries", email: "sanne@example.com", type: "consumer", licenseCount: 0, status: "lead", lastActivity: "Beta-aanvraag", signedUpAt: "21 mei 2026" },
];

// ─────────────────────────── Organizations ───────────────────────────

export type Organization = {
  id: string;
  name: string;
  slug: string;
  seatsUsed: number;
  seatsTotal: number;
  status: "active" | "trial" | "past_due";
  billingEmail: string;
  vatNumber?: string;
  plan: string;
  renewalAt: string;
};

export const MOCK_ORGANIZATIONS: Organization[] = [
  { id: "o-001", name: "Boom Advocaten", slug: "boom-advocaten", seatsUsed: 1, seatsTotal: 3, status: "trial", billingEmail: "facturen@boomadvocaten.nl", vatNumber: "NL801234567B01", plan: "Zakelijk jaar", renewalAt: "12 aug 2026" },
  { id: "o-002", name: "Praktijk Vermeer", slug: "praktijk-vermeer", seatsUsed: 6, seatsTotal: 6, status: "active", billingEmail: "admin@praktijk-vermeer.nl", plan: "Zakelijk jaar", renewalAt: "01 jan 2027" },
  { id: "o-003", name: "Zorggroep Utrecht", slug: "zorggroep-utrecht", seatsUsed: 8, seatsTotal: 14, status: "active", billingEmail: "ict@zorggroep-utrecht.nl", vatNumber: "NL899876543B01", plan: "Zakelijk jaar (volumekorting 15%)", renewalAt: "22 apr 2027" },
  { id: "o-004", name: "De Bakker Makelaars", slug: "de-bakker-makelaars", seatsUsed: 3, seatsTotal: 4, status: "active", billingEmail: "p.bakker@de-bakker-makelaars.nl", plan: "Zakelijk jaar", renewalAt: "15 mrt 2027" },
  { id: "o-005", name: "Studio Brand", slug: "studio-brand", seatsUsed: 2, seatsTotal: 3, status: "past_due", billingEmail: "finance@studiobrand.nl", plan: "Zakelijk kwartaal", renewalAt: "10 mei 2026 (verlopen)" },
];

// ─────────────────────────── Orders ───────────────────────────

export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";

export type Order = {
  id: string;
  reference: string;
  customer: string;
  email: string;
  plan: string;
  amount: string;
  status: OrderStatus;
  molliePaymentId?: string;
  createdAt: string;
};

export const MOCK_ORDERS: Order[] = [
  { id: "o-1001", reference: "ORD-2026-0142", customer: "Mostafa Amrani", email: "mostafa.a@gmail.com", plan: "Persoonlijk jaar", amount: "€96,00", status: "paid", molliePaymentId: "tr_4QFwXp9Yt2", createdAt: "21 mei 2026 09:14" },
  { id: "o-1002", reference: "ORD-2026-0141", customer: "Praktijk Vermeer", email: "admin@praktijk-vermeer.nl", plan: "Zakelijk jaar · 6 seats", amount: "€504,00", status: "paid", molliePaymentId: "tr_8WzNm4Pq1L", createdAt: "20 mei 2026 14:32" },
  { id: "o-1003", reference: "ORD-2026-0140", customer: "Sanne de Vries", email: "sanne@example.com", plan: "Persoonlijk maand", amount: "€12,00", status: "pending", molliePaymentId: "tr_3HrTk7Lw5M", createdAt: "21 mei 2026 11:47" },
  { id: "o-1004", reference: "ORD-2026-0139", customer: "Erik Vermaat", email: "erik@vermaat-fysio.nl", plan: "Persoonlijk kwartaal", amount: "€30,00", status: "failed", createdAt: "20 mei 2026 16:08" },
  { id: "o-1005", reference: "ORD-2026-0138", customer: "Noor Mansouri", email: "noor.m@studio-noor.nl", plan: "Persoonlijk maand", amount: "€12,00", status: "refunded", molliePaymentId: "tr_5KjMn8Rt2P", createdAt: "18 mei 2026 10:22" },
  { id: "o-1006", reference: "ORD-2026-0137", customer: "Zorggroep Utrecht", email: "ict@zorggroep-utrecht.nl", plan: "Zakelijk jaar · 14 seats (volumekorting)", amount: "€999,60", status: "paid", molliePaymentId: "tr_9LpQs2Vw8X", createdAt: "17 mei 2026 09:55" },
];

// ─────────────────────────── Invoices ───────────────────────────

export type Invoice = {
  id: string;
  number: string;
  customer: string;
  amount: string;
  vat: string;
  total: string;
  status: "paid" | "open" | "overdue" | "draft";
  issuedAt: string;
  dueAt: string;
  orderId: string;
};

export const MOCK_INVOICES: Invoice[] = [
  { id: "inv-001", number: "DIC-2026-0142", customer: "Mostafa Amrani", amount: "€79,34", vat: "€16,66", total: "€96,00", status: "paid", issuedAt: "21 mei 2026", dueAt: "21 mei 2026", orderId: "ORD-2026-0142" },
  { id: "inv-002", number: "DIC-2026-0141", customer: "Praktijk Vermeer", amount: "€416,53", vat: "€87,47", total: "€504,00", status: "paid", issuedAt: "20 mei 2026", dueAt: "20 mei 2026", orderId: "ORD-2026-0141" },
  { id: "inv-003", number: "DIC-2026-0140", customer: "Sanne de Vries", amount: "€9,92", vat: "€2,08", total: "€12,00", status: "open", issuedAt: "21 mei 2026", dueAt: "04 jun 2026", orderId: "ORD-2026-0140" },
  { id: "inv-004", number: "DIC-2026-0136", customer: "Studio Brand", amount: "€24,79", vat: "€5,21", total: "€30,00", status: "overdue", issuedAt: "12 apr 2026", dueAt: "26 apr 2026", orderId: "ORD-2026-0119" },
  { id: "inv-005", number: "DIC-2026-0137", customer: "Zorggroep Utrecht", amount: "€826,12", vat: "€173,48", total: "€999,60", status: "paid", issuedAt: "17 mei 2026", dueAt: "17 mei 2026", orderId: "ORD-2026-0137" },
];

// ─────────────────────────── Discount codes ───────────────────────────

export type DiscountStatus = "active" | "paused" | "expired";
export type DiscountKind = "percentage" | "fixed" | "free_months";

export type Discount = {
  id: string;
  code: string;
  kind: DiscountKind;
  value: string;
  appliesTo: "consumer" | "organization" | "all";
  redemptions: number;
  maxRedemptions: number;
  status: DiscountStatus;
  validUntil: string;
};

export const MOCK_DISCOUNTS: Discount[] = [
  { id: "d-001", code: "LAUNCH30", kind: "percentage", value: "30%", appliesTo: "consumer", redemptions: 47, maxRedemptions: 100, status: "active", validUntil: "30 jun 2026" },
  { id: "d-002", code: "TEAM-START", kind: "percentage", value: "20%", appliesTo: "organization", redemptions: 12, maxRedemptions: 50, status: "active", validUntil: "31 dec 2026" },
  { id: "d-003", code: "ZORG2026", kind: "fixed", value: "€48,00", appliesTo: "consumer", redemptions: 8, maxRedemptions: 25, status: "active", validUntil: "30 sep 2026" },
  { id: "d-004", code: "EARLYBIRD", kind: "free_months", value: "3 maanden", appliesTo: "consumer", redemptions: 100, maxRedemptions: 100, status: "expired", validUntil: "30 apr 2026" },
  { id: "d-005", code: "PARTNER-CC", kind: "percentage", value: "25%", appliesTo: "all", redemptions: 3, maxRedemptions: 200, status: "paused", validUntil: "31 dec 2026" },
];

// ─────────────────────────── Affiliates ───────────────────────────

export type Affiliate = {
  id: string;
  name: string;
  email: string;
  slug: string;
  referrals: number;
  conversions: number;
  commissionPending: string;
  commissionPaid: string;
  status: "active" | "pending_approval" | "paused";
  joinedAt: string;
};

export const MOCK_AFFILIATES: Affiliate[] = [
  { id: "a-001", name: "Marketingbureau Klick", email: "partner@klick.nl", slug: "klick", referrals: 142, conversions: 38, commissionPending: "€312,00", commissionPaid: "€918,00", status: "active", joinedAt: "12 feb 2026" },
  { id: "a-002", name: "Productiviteits-coach Bram", email: "bram@bramcoacht.nl", slug: "bram", referrals: 67, conversions: 22, commissionPending: "€96,00", commissionPaid: "€384,00", status: "active", joinedAt: "04 mrt 2026" },
  { id: "a-003", name: "Studio Daan", email: "daan@studiodaan.nl", slug: "studiodaan", referrals: 14, conversions: 3, commissionPending: "€18,00", commissionPaid: "€0,00", status: "pending_approval", joinedAt: "20 mei 2026" },
  { id: "a-004", name: "FlowState Newsletter", email: "ads@flowstate.nl", slug: "flowstate", referrals: 412, conversions: 84, commissionPending: "€504,00", commissionPaid: "€2.412,00", status: "active", joinedAt: "08 jan 2026" },
];

// ─────────────────────────── Analytics ───────────────────────────

export const FUNNEL_STEPS = [
  { label: "Bezoekers /download", value: 4218 },
  { label: "Beta-aanvragen", value: 1834 },
  { label: "Code geactiveerd", value: 968 },
  { label: "Model geïnstalleerd", value: 894 },
  { label: "Eerste dictée binnen 24u", value: 712 },
];

export const TOP_APPS = [
  { app: "Slack", pct: 28 },
  { app: "Notion", pct: 19 },
  { app: "Gmail", pct: 14 },
  { app: "ChatGPT (web)", pct: 12 },
  { app: "Apple Mail", pct: 9 },
  { app: "Overig", pct: 18 },
];

export const RETENTION_WEEKS = [
  { week: "Wk 1", pct: 100 },
  { week: "Wk 2", pct: 78 },
  { week: "Wk 3", pct: 64 },
  { week: "Wk 4", pct: 55 },
  { week: "Wk 6", pct: 47 },
  { week: "Wk 8", pct: 42 },
];

// ─────────────────────────── Support tickets ───────────────────────────

export type TicketStatus = "open" | "in_progress" | "waiting" | "closed";
export type TicketPriority = "low" | "normal" | "high";

export type Ticket = {
  id: string;
  number: string;
  subject: string;
  customer: string;
  email: string;
  status: TicketStatus;
  priority: TicketPriority;
  ageHours: number;
  licenseCode?: string;
  lastUpdate: string;
};

export const MOCK_TICKETS: Ticket[] = [
  { id: "t-048", number: "#48", subject: "Microfoon niet gevonden Windows 11", customer: "Erik Vermaat", email: "erik@vermaat-fysio.nl", status: "open", priority: "high", ageHours: 2, licenseCode: "DIC-PRO-2026-MK7L-VF21", lastUpdate: "2 u geleden" },
  { id: "t-047", number: "#47", subject: "Activatie faalt na herinstallatie macOS", customer: "Sanne de Vries", email: "sanne@example.com", status: "in_progress", priority: "normal", ageHours: 6, licenseCode: "DIC-BETA-2026-X8N3-PL2W", lastUpdate: "30 min geleden" },
  { id: "t-046", number: "#46", subject: "Restitutie-aanvraag", customer: "Noor Mansouri", email: "noor.m@studio-noor.nl", status: "waiting", priority: "normal", ageHours: 28, lastUpdate: "Gisteren 17:00" },
  { id: "t-045", number: "#45", subject: "Volumekorting 25 seats - offerte", customer: "Boom Advocaten", email: "lisa.veenstra@boomadvocaten.nl", status: "in_progress", priority: "high", ageHours: 12, lastUpdate: "08:42" },
  { id: "t-044", number: "#44", subject: "Codes resetten na laptop-wissel", customer: "Pim Bakker", email: "p.bakker@de-bakker-makelaars.nl", status: "closed", priority: "low", ageHours: 72, licenseCode: "DIC-TEAM-2026-PD2K-V8M4", lastUpdate: "18 mei 2026" },
];

// ─────────────────────────── Settings ───────────────────────────

export type IntegrationStatus = "connected" | "disconnected" | "error";

export type Integration = {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  detail: string;
};

export const MOCK_INTEGRATIONS: Integration[] = [
  { id: "mollie", name: "Mollie", description: "Betalingen en webhooks", status: "disconnected", detail: "Wacht op live API key (Slice 6)" },
  { id: "neon", name: "Neon Postgres", description: "Database", status: "connected", detail: "ep-broad-bird-all7eegv · eu-central-1" },
  { id: "neon-auth", name: "Neon Auth", description: "Authenticatie", status: "disconnected", detail: "Wacht op NEON_AUTH_BASE_URL" },
  { id: "cloudflare", name: "Cloudflare", description: "DNS + CDN (models.dicteren.ai)", status: "error", detail: "DNS-record nog niet aangemaakt" },
  { id: "email", name: "Email-provider", description: "Transactionele e-mail", status: "disconnected", detail: "Resend/Postmark — keuze nog te maken" },
];

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "support";
  lastSeen: string;
};

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: "u-001", name: "Christian Bleeker", email: "info@dicteren.ai", role: "owner", lastSeen: "Nu actief" },
  { id: "u-002", name: "Dick (AI assistent)", email: "system@dicteren.ai", role: "admin", lastSeen: "Permanent" },
];

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
};

export const MOCK_AUDIT: AuditEvent[] = [
  { id: "ae-1", actor: "Christian", action: "Genereerde", target: "10 beta-codes", at: "21 mei 09:14" },
  { id: "ae-2", actor: "System", action: "Migratie 0000 toegepast", target: "neondb", at: "21 mei 06:02" },
  { id: "ae-3", actor: "Christian", action: "Wijzigde plan-prijs", target: "Persoonlijk kwartaal · €30", at: "20 mei 22:18" },
  { id: "ae-4", actor: "System", action: "Webhook ontvangen", target: "tr_4QFwXp9Yt2 (paid)", at: "20 mei 14:33" },
  { id: "ae-5", actor: "Christian", action: "Logde in", target: "/admin", at: "20 mei 09:01" },
];
