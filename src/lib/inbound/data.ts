// Dicteren.ai — Inbound sample data, real Google Ads API v24 field shapes.
// *_micros are real micros (÷1e6 = EUR). rates are 0–1.
//
// This is the seam between the ported dashboard UI and the real data layer:
// today it returns deterministic sample data (so the design renders 1:1 while
// the developer token is still test-only); once the Neon sync lands,
// getInboundData() reads the synced rows instead. The UI never changes.

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
  prev: number;
}

export interface Account {
  customerId: string;
  email: string;
  loginCustomerId: string;
  currency: string;
  geo: string;
  lastSync: string;
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

// deterministic pseudo-random for stable timeseries (no Math.random → no hydration drift)
function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function buildSeries(
  seed: number,
  days: number,
  base: { impr: number; ctr: number; cpc: number; cvr: number },
): SeriesPoint[] {
  const r = seeded(seed);
  const out: SeriesPoint[] = [];
  const today = new Date("2026-06-30");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const wobble = 0.7 + r() * 0.6;
    const trend = 1 + ((days - i) / days) * 0.5;
    const impressions = Math.round(base.impr * wobble * trend);
    const clicks = Math.round(impressions * (base.ctr * (0.85 + r() * 0.3)));
    const cost = Math.round(clicks * base.cpc * (0.9 + r() * 0.2));
    const conv = Math.max(0, Math.round(clicks * base.cvr * (0.6 + r() * 0.9) * 10) / 10);
    out.push({
      date: d.toISOString().slice(0, 10),
      impressions,
      clicks,
      cost_micros: cost,
      conversions: conv,
      conversions_value_micros: Math.round(conv * 19 * 1e6),
    });
  }
  return out;
}

export const INTENTS: Record<Intent, IntentMeta> = {
  brand: { label: "Brand", color: "var(--aqua)", cls: "badge-aqua" },
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

function sampleCampaigns(): Campaign[] {
  const campaigns: Campaign[] = [
    {
      id: "22041988127", name: "NL · Wispr Flow alternatief — Search",
      status: "ENABLED", advertising_channel_type: "SEARCH",
      bidding_strategy_type: "MAXIMIZE_CONVERSIONS", start_date: "2026-06-02", end_date: null,
      budget_micros: 35_000000, geo: "Nederland",
      metrics: { impressions: 18420, clicks: 1163, cost_micros: 2_847_000000, conversions: 64.0, conversions_value_micros: 1_216_000000, ctr: 0.0631, average_cpc_micros: 2_448000, conversions_from_interactions_rate: 0.055, cost_per_conversion_micros: 44_484000, search_impression_share: 0.42, search_budget_lost_impression_share: 0.27, search_rank_lost_impression_share: 0.31, absolute_top_impression_percentage: 0.38 },
      seed: 7, series: [],
    },
    {
      id: "22041988201", name: "NL · Spraak naar tekst — Problem",
      status: "ENABLED", advertising_channel_type: "SEARCH",
      bidding_strategy_type: "MAXIMIZE_CONVERSIONS", start_date: "2026-06-05", end_date: null,
      budget_micros: 25_000000, geo: "Nederland",
      metrics: { impressions: 12760, clicks: 731, cost_micros: 1_523_000000, conversions: 38.0, conversions_value_micros: 722_000000, ctr: 0.0573, average_cpc_micros: 2_083000, conversions_from_interactions_rate: 0.052, cost_per_conversion_micros: 40_079000, search_impression_share: 0.51, search_budget_lost_impression_share: 0.18, search_rank_lost_impression_share: 0.31, absolute_top_impression_percentage: 0.44 },
      seed: 13, series: [],
    },
    {
      id: "22041988233", name: "NL · Dicteren.ai — Brand",
      status: "ENABLED", advertising_channel_type: "SEARCH",
      bidding_strategy_type: "TARGET_CPA", start_date: "2026-06-02", end_date: null,
      budget_micros: 10_000000, geo: "Nederland",
      metrics: { impressions: 4980, clicks: 612, cost_micros: 287_000000, conversions: 41.0, conversions_value_micros: 779_000000, ctr: 0.1229, average_cpc_micros: 469000, conversions_from_interactions_rate: 0.067, cost_per_conversion_micros: 7_000000, search_impression_share: 0.88, search_budget_lost_impression_share: 0.04, search_rank_lost_impression_share: 0.08, absolute_top_impression_percentage: 0.79 },
      seed: 21, series: [],
    },
    {
      id: "22041988277", name: "NL · AI dicteersoftware MKB — Solution",
      status: "ENABLED", advertising_channel_type: "SEARCH",
      bidding_strategy_type: "MANUAL_CPC", start_date: "2026-06-09", end_date: null,
      budget_micros: 20_000000, geo: "Nederland",
      metrics: { impressions: 9240, clicks: 408, cost_micros: 1_104_000000, conversions: 17.0, conversions_value_micros: 323_000000, ctr: 0.0442, average_cpc_micros: 2_706000, conversions_from_interactions_rate: 0.0417, cost_per_conversion_micros: 64_941000, search_impression_share: 0.34, search_budget_lost_impression_share: 0.22, search_rank_lost_impression_share: 0.44, absolute_top_impression_percentage: 0.29 },
      seed: 34, series: [],
    },
    {
      id: "22041988299", name: "NL · Toegankelijkheid & zorg — Local",
      status: "PAUSED", advertising_channel_type: "SEARCH",
      bidding_strategy_type: "MANUAL_CPC", start_date: "2026-06-11", end_date: null,
      budget_micros: 15_000000, geo: "Nederland",
      metrics: { impressions: 3110, clicks: 121, cost_micros: 388_000000, conversions: 4.0, conversions_value_micros: 76_000000, ctr: 0.0389, average_cpc_micros: 3_207000, conversions_from_interactions_rate: 0.0331, cost_per_conversion_micros: 97_000000, search_impression_share: 0.28, search_budget_lost_impression_share: 0.12, search_rank_lost_impression_share: 0.6, absolute_top_impression_percentage: 0.22 },
      seed: 41, series: [],
    },
  ];
  campaigns.forEach((c) => {
    c.series = buildSeries(c.seed, 28, {
      impr: c.metrics.impressions / 28,
      ctr: c.metrics.ctr,
      cpc: c.metrics.average_cpc_micros,
      cvr: c.metrics.conversions_from_interactions_rate,
    });
  });
  return campaigns;
}

const keywords: Keyword[] = [
  { id: "k1", text: "wispr flow alternatief", match_type: "EXACT", intent: "competitor", status: "ENABLED", quality_score: 8, campaignId: "22041988127", impressions: 4120, clicks: 318, ctr: 0.0772, cpc_micros: 2_640000, conversions: 21, cost_micros: 840_000000, cpa_micros: 40_000000 },
  { id: "k2", text: "wispr flow nederlands", match_type: "PHRASE", intent: "competitor", status: "ENABLED", quality_score: 7, campaignId: "22041988127", impressions: 3380, clicks: 241, ctr: 0.0713, cpc_micros: 2_510000, conversions: 14, cost_micros: 605_000000, cpa_micros: 43_214000 },
  { id: "k3", text: "wispr flow review", match_type: "PHRASE", intent: "competitor", status: "ENABLED", quality_score: 6, campaignId: "22041988127", impressions: 2210, clicks: 132, ctr: 0.0597, cpc_micros: 2_180000, conversions: 6, cost_micros: 288_000000, cpa_micros: 48_000000 },
  { id: "k4", text: "lokaal dicteren mac", match_type: "EXACT", intent: "solution", status: "ENABLED", quality_score: 9, campaignId: "22041988127", impressions: 1890, clicks: 142, ctr: 0.0751, cpc_micros: 2_010000, conversions: 12, cost_micros: 285_000000, cpa_micros: 23_750000 },
  { id: "k5", text: "spraak naar tekst app", match_type: "PHRASE", intent: "problem", status: "ENABLED", quality_score: 7, campaignId: "22041988201", impressions: 5230, clicks: 287, ctr: 0.0549, cpc_micros: 1_980000, conversions: 15, cost_micros: 568_000000, cpa_micros: 37_867000 },
  { id: "k6", text: "dicteren op computer", match_type: "PHRASE", intent: "problem", status: "ENABLED", quality_score: 8, campaignId: "22041988201", impressions: 3940, clicks: 221, ctr: 0.0561, cpc_micros: 2_140000, conversions: 13, cost_micros: 473_000000, cpa_micros: 36_385000 },
  { id: "k7", text: "tekst inspreken windows", match_type: "BROAD", intent: "problem", status: "PAUSED", quality_score: 5, campaignId: "22041988201", impressions: 3590, clicks: 223, ctr: 0.0621, cpc_micros: 2_120000, conversions: 10, cost_micros: 482_000000, cpa_micros: 48_200000 },
  { id: "k8", text: "dicteren.ai", match_type: "EXACT", intent: "brand", status: "ENABLED", quality_score: 10, campaignId: "22041988233", impressions: 3210, clicks: 421, ctr: 0.1312, cpc_micros: 432000, conversions: 29, cost_micros: 182_000000, cpa_micros: 6_276000 },
  { id: "k9", text: "dicteren ai inloggen", match_type: "PHRASE", intent: "brand", status: "ENABLED", quality_score: 9, campaignId: "22041988233", impressions: 1770, clicks: 191, ctr: 0.1079, cpc_micros: 549000, conversions: 12, cost_micros: 105_000000, cpa_micros: 8_750000 },
  { id: "k10", text: "ai dicteersoftware bedrijf", match_type: "PHRASE", intent: "solution", status: "ENABLED", quality_score: 7, campaignId: "22041988277", impressions: 4880, clicks: 214, ctr: 0.0439, cpc_micros: 2_680000, conversions: 9, cost_micros: 573_000000, cpa_micros: 63_667000 },
  { id: "k11", text: "spraakherkenning software mkb", match_type: "BROAD", intent: "solution", status: "ENABLED", quality_score: 6, campaignId: "22041988277", impressions: 4360, clicks: 194, ctr: 0.0445, cpc_micros: 2_730000, conversions: 8, cost_micros: 530_000000, cpa_micros: 66_250000 },
  { id: "k12", text: "dicteren voor slechtzienden", match_type: "PHRASE", intent: "local", status: "PAUSED", quality_score: 7, campaignId: "22041988299", impressions: 1680, clicks: 67, ctr: 0.0399, cpc_micros: 3_120000, conversions: 2, cost_micros: 209_000000, cpa_micros: 104_500000 },
  { id: "k13", text: "spraak naar tekst reuma", match_type: "PHRASE", intent: "local", status: "PAUSED", quality_score: 6, campaignId: "22041988299", impressions: 1430, clicks: 54, ctr: 0.0378, cpc_micros: 3_290000, conversions: 2, cost_micros: 178_000000, cpa_micros: 89_000000 },
];

const searchTerms: SearchTerm[] = [
  { term: "wispr flow alternatief nederlands", triggeredBy: "wispr flow alternatief", match: "PHRASE", clicks: 84, cost_micros: 218_000000, conversions: 7, status: "ADDED", campaignId: "22041988127" },
  { term: "gratis dicteer app", triggeredBy: "spraak naar tekst app", match: "BROAD", clicks: 61, cost_micros: 181_000000, conversions: 0, status: "NONE", campaignId: "22041988201" },
  { term: "wispr flow gratis", triggeredBy: "wispr flow review", match: "PHRASE", clicks: 47, cost_micros: 132_000000, conversions: 0, status: "NONE", campaignId: "22041988127" },
  { term: "spraak naar tekst word", triggeredBy: "spraak naar tekst app", match: "PHRASE", clicks: 38, cost_micros: 79_000000, conversions: 4, status: "ADDED", campaignId: "22041988201" },
  { term: "is dicteren ai gratis", triggeredBy: "dicteren.ai", match: "PHRASE", clicks: 29, cost_micros: 14_000000, conversions: 2, status: "NONE", campaignId: "22041988233" },
  { term: "dragon naturally speaking", triggeredBy: "ai dicteersoftware bedrijf", match: "BROAD", clicks: 24, cost_micros: 86_000000, conversions: 0, status: "EXCLUDED", campaignId: "22041988277" },
  { term: "gratis spraak naar tekst online", triggeredBy: "tekst inspreken windows", match: "BROAD", clicks: 22, cost_micros: 61_000000, conversions: 0, status: "NONE", campaignId: "22041988201" },
  { term: "wispr flow downloaden", triggeredBy: "wispr flow nederlands", match: "PHRASE", clicks: 19, cost_micros: 52_000000, conversions: 2, status: "ADDED", campaignId: "22041988127" },
  { term: "tekst typen met stem", triggeredBy: "dicteren op computer", match: "PHRASE", clicks: 17, cost_micros: 41_000000, conversions: 1, status: "NONE", campaignId: "22041988201" },
  { term: "voice typing chrome", triggeredBy: "spraakherkenning software mkb", match: "BROAD", clicks: 14, cost_micros: 47_000000, conversions: 0, status: "EXCLUDED", campaignId: "22041988277" },
];

const proposals: Proposal[] = [
  { id: "p-238", type: "negative_keyword", status: "proposed", createdAt: "2026-06-30T07:02:00", runId: "run-091",
    finding: "Zoekterm 'gratis dicteer app' kostte €181 over 14 dagen zonder enige conversie.",
    proposal: "Voeg 'gratis' toe als campagne-brede negative keyword in NL · Spraak naar tekst — Problem.",
    impact: "≈ €181/14d bespaard · CPA-daling verwacht", rationale: { keyword: "gratis (phrase)", intent: "problem", campaign: "NL · Spraak naar tekst — Problem" },
    payload: { negative: "gratis", match_type: "PHRASE", level: "campaign", campaignId: "22041988201" } },
  { id: "p-237", type: "new_keyword", status: "proposed", createdAt: "2026-06-30T07:02:00", runId: "run-091",
    finding: "Zoekterm 'wispr flow alternatief nederlands' converteert op 8,3% maar staat niet als eigen keyword.",
    proposal: "Voeg 'wispr flow alternatief nederlands' toe als EXACT keyword in de competitor-adgroup.",
    impact: "≈ +6 conv./maand bij gelijk budget", rationale: { keyword: "wispr flow alternatief nederlands", intent: "competitor", campaign: "NL · Wispr Flow alternatief — Search" },
    payload: { keyword: "wispr flow alternatief nederlands", match_type: "EXACT", adGroup: "Competitor — Wispr", campaignId: "22041988127" } },
  { id: "p-236", type: "budget_change", status: "proposed", createdAt: "2026-06-30T07:02:00", runId: "run-091",
    finding: "Brand-campagne verliest 4% impr. share door budget terwijl CPA slechts €7 is.",
    proposal: "Verhoog dagbudget NL · Dicteren.ai — Brand van €10 naar €15.",
    impact: "≈ +12 conv./maand · CPA blijft < €8", rationale: { keyword: "—", intent: "brand", campaign: "NL · Dicteren.ai — Brand" },
    payload: { from_micros: 10_000000, to_micros: 15_000000, campaignId: "22041988233" } },
  { id: "p-235", type: "pause", status: "proposed", createdAt: "2026-06-30T07:02:00", runId: "run-091",
    finding: "Keyword 'spraakherkenning software mkb' heeft CPA €66 — 50% boven doel — over 21 dagen.",
    proposal: "Pauzeer 'spraakherkenning software mkb' (BROAD) en heralloceer naar solution-EXACT.",
    impact: "≈ €530/maand vrijgemaakt", rationale: { keyword: "spraakherkenning software mkb", intent: "solution", campaign: "NL · AI dicteersoftware MKB — Solution" },
    payload: { keywordId: "k11", campaignId: "22041988277" } },
  { id: "p-234", type: "bid_change", status: "proposed", createdAt: "2026-06-30T07:02:00", runId: "run-091",
    finding: "'lokaal dicteren mac' heeft de laagste CPA (€23,75) maar mist top-of-page.",
    proposal: "Verhoog bod op 'lokaal dicteren mac' met +20% (MANUAL_CPC adgroup).",
    impact: "≈ +30% top-impr. · CPA blijft < doel", rationale: { keyword: "lokaal dicteren mac", intent: "solution", campaign: "NL · Wispr Flow alternatief — Search" },
    payload: { keywordId: "k4", bid_delta_pct: 20, campaignId: "22041988127" } },
  { id: "p-233", type: "negative_keyword", status: "applied", createdAt: "2026-06-28T07:01:00", appliedAt: "2026-06-28T09:40:00", approvedBy: "Christian", runId: "run-089",
    finding: "'voice typing chrome' — 14 clicks, €47, 0 conversies.", proposal: "Sluit 'voice typing chrome' uit (BROAD negative).", impact: "€47 bespaard", rationale: { keyword: "voice typing chrome", intent: "solution", campaign: "NL · AI dicteersoftware MKB — Solution" }, payload: {}, resourceId: "customers/7132988127/campaignCriteria/22041988277~9182" },
  { id: "p-232", type: "new_keyword", status: "applied", createdAt: "2026-06-27T07:00:00", appliedAt: "2026-06-27T08:15:00", approvedBy: "Christian", runId: "run-088",
    finding: "'spraak naar tekst word' converteert (4 conv).", proposal: "Voeg toe als PHRASE keyword.", impact: "+4 conv", rationale: { keyword: "spraak naar tekst word", intent: "problem", campaign: "NL · Spraak naar tekst — Problem" }, payload: {}, resourceId: "customers/7132988127/adGroupCriteria/9920~447182" },
  { id: "p-231", type: "budget_change", status: "rejected", createdAt: "2026-06-26T07:00:00", rejectedAt: "2026-06-26T10:02:00", approvedBy: "Christian", runId: "run-087",
    finding: "Solution-campagne kan meer volume aan.", proposal: "Verhoog budget naar €30.", impact: "+volume", rationale: { keyword: "—", intent: "solution", campaign: "NL · AI dicteersoftware MKB — Solution" }, payload: {}, note: "CPA eerst onder doel brengen voordat we opschalen." },
  { id: "p-230", type: "new_campaign", status: "applied", createdAt: "2026-06-24T07:00:00", appliedAt: "2026-06-24T11:30:00", approvedBy: "Christian", runId: "run-085",
    finding: "Brand-zoekvolume groeit, geen aparte brand-campagne.", proposal: "Start NL · Dicteren.ai — Brand.", impact: "Goedkoopste conv-bron", rationale: { keyword: "dicteren.ai", intent: "brand", campaign: "NL · Dicteren.ai — Brand" }, payload: {}, resourceId: "customers/7132988127/campaigns/22041988233" },
];

const conversionActions: ConversionAction[] = [
  { name: "Trial gestart", type: "WEBPAGE", category: "SIGNUP", status: "ENABLED", primary: true, count_30d: 142, value_micros: 0 },
  { name: "Abonnement gekocht", type: "WEBPAGE", category: "PURCHASE", status: "ENABLED", primary: false, count_30d: 38, value_micros: 19_00000 * 38 },
];

const vickyRuns: VickyRun[] = [
  { id: "run-091", startedAt: "2026-06-30T07:00:00", status: "completed", durationSec: 412, proposals: 5, summary: "Dagelijkse audit · 5 campagnes · 14d window. 5 voorstellen: 1 negative, 1 keyword, 1 budget, 1 pauze, 1 bod.",
    steps: [
      { n: 1, label: "Sync-data ophalen (read-only MCP)", status: "done", detail: "ads_get_campaigns · 5 campagnes · 28d metrics", ms: 3800 },
      { n: 2, label: "Funnel-analyse per campagne", status: "done", detail: "Impr → clicks → trial → paid. Brand sterkst (CPA €7).", ms: 14200 },
      { n: 3, label: "Search-term review (48–72u cadans)", status: "done", detail: "10 nieuwe termen · 2 verspillers gevonden", ms: 22100 },
      { n: 4, label: "Keyword-economics (CPA vs doel)", status: "done", detail: "2 keywords boven doel · 1 onderbenut", ms: 9400 },
      { n: 5, label: "Concurrent-claims check (eigen bron)", status: "done", detail: "concurrent-claims-wispr.md geverifieerd", ms: 5100 },
      { n: 6, label: "Voorstellen opstellen + rationale", status: "done", detail: "5 proposals · status=proposed", ms: 11800 },
      { n: 7, label: "agent_report_status", status: "done", detail: "run-091 completed · 5 proposals klaar voor review", ms: 900 },
    ] },
  { id: "run-089", startedAt: "2026-06-28T07:00:00", status: "completed", durationSec: 388, proposals: 3, summary: "Search-term review + economics. 3 voorstellen, 2 toegepast.", steps: [] },
  { id: "run-088", startedAt: "2026-06-27T07:00:00", status: "completed", durationSec: 401, proposals: 2, summary: "Keyword-uitbreiding op converterende zoektermen.", steps: [] },
  { id: "run-085", startedAt: "2026-06-24T07:00:00", status: "completed", durationSec: 455, proposals: 4, summary: "Brand-campagne voorgesteld en gestart.", steps: [] },
];

const account: Account = {
  customerId: "7132988127", email: "info@dicteren.ai", loginCustomerId: "co-creatie.ai",
  currency: "EUR", geo: "Nederland", lastSync: "2026-06-30T09:14:00", tokenAccess: "test",
  kpis: {
    impressions: { v: 48510, prev: 41200 },
    clicks: { v: 3035, prev: 2610 },
    conversions: { v: 164, prev: 131 },
    cost_micros: { v: 6_149_000000, prev: 5_420_000000 },
    ctr: { v: 0.0626, prev: 0.0634 },
    average_cpc_micros: { v: 2_026000, prev: 2_077000 },
    conversions_from_interactions_rate: { v: 0.054, prev: 0.0502 },
    cost_per_conversion_micros: { v: 37_494000, prev: 41_374000 },
    search_impression_share: { v: 0.47, prev: 0.44 },
  },
};

/**
 * Returns the inbound dashboard data. Today: deterministic sample data with the
 * real Google Ads field shapes. Once the Neon sync lands, this reads the synced
 * rows (ad_campaigns, ad_keywords, ad_metrics_daily, ad_proposals) instead —
 * the UI consumes the same InboundData shape and does not change.
 */
export function getInboundData(): InboundData {
  const campaigns = sampleCampaigns();
  const accountSeries: SeriesPoint[] = campaigns[0].series.map((_, i) => {
    const day: SeriesPoint = { date: campaigns[0].series[i].date, impressions: 0, clicks: 0, cost_micros: 0, conversions: 0, conversions_value_micros: 0 };
    campaigns.forEach((c) => {
      const s = c.series[i];
      day.impressions += s.impressions;
      day.clicks += s.clicks;
      day.cost_micros += s.cost_micros;
      day.conversions += s.conversions;
      day.conversions_value_micros += s.conversions_value_micros;
    });
    day.conversions = Math.round(day.conversions * 10) / 10;
    return day;
  });
  return { campaigns, keywords, searchTerms, proposals, conversionActions, vickyRuns, account, accountSeries, INTENTS, PROP_TYPES };
}
