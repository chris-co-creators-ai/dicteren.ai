// Dicteren.ai — Inbound data layer. Real Google Ads API v24 field shapes.
// *_micros are real micros (÷1e6 = EUR). rates are 0–1.
//
// This is the seam between the dashboard UI and the real data. Today it returns
// an EMPTY dataset (no campaigns/keywords/proposals yet) so the dashboard shows
// the real "nothing synced yet" state — the developer token is still test-only.
// Once the Neon sync lands, getInboundData() reads the synced rows
// (ad_campaigns, ad_keywords, ad_metrics_daily, ad_proposals); the UI does not change.

export type CampaignStatus = "ENABLED" | "PAUSED" | "REMOVED";
export type MatchType = "EXACT" | "PHRASE" | "BROAD";
export type SearchTermStatus = "ADDED" | "EXCLUDED" | "NONE";
export type Intent = "brand" | "problem" | "solution" | "competitor" | "local";
export type ProposalType =
  | "new_campaign"
  | "new_keyword"
  | "negative_keyword"
  | "budget_change"
  | "pause"
  | "bid_change";
export type ProposalStatus = "draft" | "proposed" | "approved" | "applied" | "rejected";

export interface SeriesPoint {
  date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  conversions_value_micros: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  conversions_value_micros: number;
  ctr: number;
  average_cpc_micros: number;
  conversions_from_interactions_rate: number;
  cost_per_conversion_micros: number;
  search_impression_share: number;
  search_budget_lost_impression_share: number;
  search_rank_lost_impression_share: number;
  absolute_top_impression_percentage: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  advertising_channel_type: "SEARCH" | "PERFORMANCE_MAX" | "DISPLAY";
  bidding_strategy_type: string;
  start_date: string;
  end_date: string | null;
  budget_micros: number;
  geo: string;
  metrics: CampaignMetrics;
  seed: number;
  series: SeriesPoint[];
}

export interface Keyword {
  id: string;
  text: string;
  match_type: MatchType;
  intent: Intent;
  status: CampaignStatus;
  quality_score: number;
  campaignId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc_micros: number;
  conversions: number;
  cost_micros: number;
  cpa_micros: number;
}

export interface SearchTerm {
  term: string;
  triggeredBy: string;
  match: MatchType;
  clicks: number;
  cost_micros: number;
  conversions: number;
  status: SearchTermStatus;
  campaignId: string;
}

export interface ProposalRationale {
  keyword: string;
  intent: Intent | string;
  campaign: string;
}

export interface Proposal {
  id: string;
  type: ProposalType;
  status: ProposalStatus;
  createdAt: string;
  runId: string;
  finding: string;
  proposal: string;
  impact: string;
  rationale: ProposalRationale;
  payload: Record<string, unknown>;
  appliedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  resourceId?: string;
  note?: string;
}

export interface ConversionAction {
  name: string;
  type: string;
  category: string;
  status: string;
  primary: boolean;
  count_30d: number;
  value_micros: number;
}

export interface VickyStep {
  n: number;
  label: string;
  status: string;
  detail: string;
  ms: number;
}

export interface VickyRun {
  id: string;
  startedAt: string;
  status: string;
  durationSec: number;
  proposals: number;
  summary: string;
  steps: VickyStep[];
}

export interface KpiPair {
  v: number;
  prev: number | null;
}

export interface Account {
  customerId: string;
  email: string;
  loginCustomerId: string;
  currency: string;
  geo: string;
  lastSync: string | null;
  tokenAccess: "test" | "basic";
  kpis: Record<string, KpiPair>;
}

export interface IntentMeta {
  label: string;
  color: string;
  cls: string;
}
export interface ProposalTypeMeta {
  label: string;
  cls: string;
}

export interface InboundData {
  campaigns: Campaign[];
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  proposals: Proposal[];
  conversionActions: ConversionAction[];
  vickyRuns: VickyRun[];
  account: Account;
  accountSeries: SeriesPoint[];
  INTENTS: Record<Intent, IntentMeta>;
  PROP_TYPES: Record<ProposalType, ProposalTypeMeta>;
}

// Vocabulary maps (labels + colors) — not data, the UI needs these for rendering.
export const INTENTS: Record<Intent, IntentMeta> = {
  brand: { label: "Brand", color: "var(--aqua-600)", cls: "badge-aqua" },
  problem: { label: "Problem", color: "var(--blue)", cls: "badge-blue" },
  solution: { label: "Solution", color: "var(--violet)", cls: "badge-violet" },
  competitor: { label: "Competitor", color: "var(--orange)", cls: "badge-orange" },
  local: { label: "Local", color: "var(--green)", cls: "badge-green" },
};

export const PROP_TYPES: Record<ProposalType, ProposalTypeMeta> = {
  new_campaign: { label: "Nieuwe campagne", cls: "badge-violet" },
  new_keyword: { label: "Nieuw keyword", cls: "badge-blue" },
  negative_keyword: { label: "Negative keyword", cls: "badge-red" },
  budget_change: { label: "Budget", cls: "badge-amber" },
  pause: { label: "Pauzeren", cls: "badge-muted" },
  bid_change: { label: "Bod", cls: "badge-aqua" },
};

const EMPTY_KPIS: Record<string, KpiPair> = {
  impressions: { v: 0, prev: null },
  clicks: { v: 0, prev: null },
  conversions: { v: 0, prev: null },
  cost_micros: { v: 0, prev: null },
  ctr: { v: 0, prev: null },
  average_cpc_micros: { v: 0, prev: null },
  conversions_from_interactions_rate: { v: 0, prev: null },
  cost_per_conversion_micros: { v: 0, prev: null },
  search_impression_share: { v: 0, prev: null },
};

// The connected Google Ads account (facts, not sample data).
const account: Account = {
  customerId: "7132988127",
  email: "info@dicteren.ai",
  loginCustomerId: "485-571-2942",
  currency: "EUR",
  geo: "Nederland",
  lastSync: null,
  tokenAccess: "test",
  kpis: EMPTY_KPIS,
};

/**
 * Returns the inbound dashboard data. Today: an empty dataset — no campaigns,
 * keywords or proposals yet (token is test-only, no sync has run). The dashboard
 * renders its real empty states. Once the Neon sync lands, this reads the synced
 * rows; the UI consumes the same InboundData shape and does not change.
 */
export function getInboundData(): InboundData {
  return {
    campaigns: [],
    keywords: [],
    searchTerms: [],
    proposals: [],
    conversionActions: [],
    vickyRuns: [],
    account,
    accountSeries: [],
    INTENTS,
    PROP_TYPES,
  };
}
