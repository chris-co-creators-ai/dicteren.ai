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
