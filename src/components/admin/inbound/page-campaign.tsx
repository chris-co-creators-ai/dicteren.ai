"use client";
// Inbound — Campagne-detail. Verloop-over-tijd grafiek + keyword/zoekterm/ad-group/
// advertenties/wijzigingen tabs. Ported from page-campaign.jsx; window.DATA → data prop.
import { useState } from "react";
import { Icon } from "./icons";
import { Badge, Btn, Card, CardHead, StatusBadge, IntentBadge, MatchBadge, QScore, PeriodSelect, Select } from "./ui";
import { AreaChart, MiniBar } from "./charts";
import { fmt } from "@/lib/inbound/format";
import { INTENTS, type InboundData, type Campaign, type Keyword, type Intent } from "@/lib/inbound/data";
import type { InboundStore, NavFn } from "./types";

const metricColors: Record<string, string> = { cost_micros: "var(--orange)", clicks: "var(--aqua-600)", conversions: "var(--green)", impressions: "var(--blue)" };
const metricLabels: [string, string][] = [["cost_micros", "Kosten"], ["clicks", "Clicks"], ["conversions", "Conv."], ["impressions", "Impr."]];

export function PageCampaign({ data, id, period, setPeriod, nav, store }: {
  data: InboundData; id: string | null; period: string; setPeriod: (v: string) => void; nav: NavFn; store: InboundStore;
}) {
  const c = data.campaigns.find((x) => x.id === id) || data.campaigns[0];
  const [tab, setTab] = useState("keywords");
  const [metric, setMetric] = useState("cost_micros");
  const [intentF, setIntentF] = useState("all");
  const [matchF, setMatchF] = useState("all");

  const kws = data.keywords.filter((k) => k.campaignId === c.id);
  const terms = data.searchTerms.filter((t) => t.campaignId === c.id);
  const m = c.metrics;

  const fKws = kws.filter((k) => (intentF === "all" || k.intent === intentF) && (matchF === "all" || k.match_type === matchF));

  function makeProposal(type: "negative_keyword" | "new_keyword", payload: Record<string, unknown>, finding: string, proposal: string) {
    store.addProposal({
      type, payload: { ...payload, campaignId: c.id }, finding, proposal, status: "proposed",
      createdAt: new Date().toISOString(), id: "p-" + Math.floor(Math.random() * 900 + 100), runId: "handmatig",
      impact: "Handmatig voorgesteld door Christian",
      rationale: { keyword: (payload.keyword as string) || (payload.negative as string) || "—", intent: (payload.intent as string) || "problem", campaign: c.name },
    });
    store.toast("Voorstel aangemaakt → naar goedkeuringsfeed");
  }

  return (
    <div className="stack">
      {/* Header */}
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10, paddingLeft: 4 }} onClick={() => nav("overview")}><Icon d="chevLeft" size={14} />Terug naar overzicht</button>
        <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{c.name}</h1>
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <StatusBadge status={c.status} />
              <Badge tone="muted">{c.advertising_channel_type}</Badge>
              <Badge tone="muted"><Icon d="wallet" size={11} />{fmt.eur(c.budget_micros)}/dag</Badge>
              <Badge tone="muted">{c.bidding_strategy_type}</Badge>
              <Badge tone="green"><Icon d="globe" size={11} />{c.geo}</Badge>
              <span className="mono faint" style={{ fontSize: 11 }}>#{c.id}</span>
            </div>
          </div>
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid-kpi-5">
        {([["Impr.", fmt.num(m.impressions)], ["Clicks", fmt.num(m.clicks)], ["CTR", fmt.pct(m.ctr)], ["Conv.", fmt.num1(m.conversions)], ["CPA", fmt.eur2(m.cost_per_conversion_micros)]] as [string, string][]).map(([l, v]) => (
          <div className="kpi" key={l} style={{ padding: "13px 16px" }}><div className="kpi-label">{l}</div><div className="kpi-val" style={{ fontSize: 22, marginTop: 5 }}>{v}</div></div>
        ))}
      </div>

      {/* Timeseries */}
      <Card>
        <CardHead title="Verloop over tijd" desc="Dagelijkse prestatie · laatste 28 dagen" icon="activity"
          right={<div className="seg">{metricLabels.map(([v, l]) => <button key={v} className={metric === v ? "active" : ""} onClick={() => setMetric(v)}>{l}</button>)}</div>} />
        <div style={{ padding: 18 }}><AreaChart series={c.series} metric={metric} color={metricColors[metric]} height={260} /></div>
      </Card>

      {/* Tabs */}
      <div>
        <div className="tabs" style={{ marginBottom: 14 }}>
          {([["adgroups", "Ad-groups"], ["keywords", "Keywords"], ["terms", "Zoektermen"], ["ads", "Advertenties"], ["changes", "Wijzigingen"]] as [string, string][]).map(([v, l]) => (
            <button key={v} className={"tab" + (tab === v ? " active" : "")} onClick={() => setTab(v)}>{l}{v === "keywords" && <span className="badge-count" style={{ marginLeft: 7, background: "var(--surface-3)", color: "var(--fg-muted)" }}>{kws.length}</span>}{v === "terms" && <span className="badge-count" style={{ marginLeft: 7, background: "var(--surface-3)", color: "var(--fg-muted)" }}>{terms.length}</span>}</button>
          ))}
        </div>

        {tab === "keywords" && (
          <Card>
            <CardHead title="Keywords" desc="Filter op intent en match-type"
              right={<div className="row" style={{ gap: 8 }}>
                <Select value={intentF} width={140} onChange={setIntentF} options={[{ v: "all", l: "Alle intents" }, ...Object.entries(INTENTS).map(([k, i]) => ({ v: k, l: i.label }))]} />
                <Select value={matchF} width={130} onChange={setMatchF} options={[{ v: "all", l: "Alle match" }, { v: "EXACT", l: "Exact" }, { v: "PHRASE", l: "Phrase" }, { v: "BROAD", l: "Broad" }]} />
              </div>} />
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Keyword</th><th>Match</th><th>Intent</th><th className="num">Q-score</th><th className="num">Impr.</th><th className="num">Clicks</th><th className="num">CTR</th><th className="num">CPC</th><th className="num">Conv.</th><th className="num">CPA</th><th>Status</th></tr></thead>
              <tbody>
                {fKws.map((k) => (
                  <tr key={k.id} className={k.status === "PAUSED" ? "dimmed" : ""}>
                    <td style={{ fontWeight: 550 }}>{k.text}</td><td><MatchBadge m={k.match_type} /></td><td><IntentBadge intent={k.intent} /></td>
                    <td className="num"><QScore v={k.quality_score} /></td><td className="num">{fmt.num(k.impressions)}</td><td className="num">{fmt.num(k.clicks)}</td>
                    <td className="num">{fmt.pct(k.ctr)}</td><td className="num">{fmt.eur2(k.cpc_micros)}</td><td className="num">{fmt.num(k.conversions)}</td>
                    <td className="num"><span style={{ color: k.cpa_micros > 50e6 ? "var(--red)" : k.cpa_micros < 15e6 ? "var(--green)" : "var(--fg)" }}>{fmt.eur2(k.cpa_micros)}</span></td>
                    <td><StatusBadge status={k.status} /></td>
                  </tr>
                ))}
                {fKws.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", color: "var(--fg-soft)", padding: 32 }}>Geen keywords voor dit filter.</td></tr>}
              </tbody>
            </table></div>
          </Card>
        )}

        {tab === "terms" && (
          <Card>
            <CardHead title="Zoektermen" desc="Wat gebruikers echt typten · acties maken een voorstel (geen directe mutatie)" />
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Zoekterm</th><th>Getriggerd door</th><th>Match</th><th className="num">Clicks</th><th className="num">Kosten</th><th className="num">Conv.</th><th>Status</th><th className="num">Actie</th></tr></thead>
              <tbody>
                {terms.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 550 }}>{t.term}</td>
                    <td className="muted">{t.triggeredBy}</td><td><MatchBadge m={t.match} /></td>
                    <td className="num">{fmt.num(t.clicks)}</td><td className="num">{fmt.eur(t.cost_micros)}</td>
                    <td className="num"><span style={{ color: t.conversions === 0 ? "var(--red)" : "var(--green)" }}>{t.conversions}</span></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="num">
                      {t.status === "NONE" && (
                        <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                          {t.conversions === 0
                            ? <Btn variant="outline" size="sm" icon="ban" onClick={() => makeProposal("negative_keyword", { negative: t.term, match_type: "PHRASE", intent: "problem" }, `Zoekterm '${t.term}' kostte ${fmt.eur(t.cost_micros)} zonder conversie.`, `Sluit '${t.term}' uit als negative keyword.`)}>Uitsluiten</Btn>
                            : <Btn variant="outline" size="sm" icon="plus" onClick={() => makeProposal("new_keyword", { keyword: t.term, match_type: "PHRASE", intent: "problem" }, `Zoekterm '${t.term}' converteert (${t.conversions} conv) maar is geen keyword.`, `Voeg '${t.term}' toe als PHRASE keyword.`)}>Toevoegen</Btn>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Card>
        )}

        {tab === "adgroups" && (
          <Card>
            <CardHead title="Ad-groups" />
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Ad-group</th><th>Status</th><th className="num">Keywords</th><th className="num">Impr.</th><th className="num">Clicks</th><th className="num">Conv.</th><th className="num">CPA</th></tr></thead>
              <tbody>
                {adGroupsFor(c, kws).map((g, i) => (
                  <tr key={i}><td style={{ fontWeight: 550 }}>{g.name}</td><td><StatusBadge status={g.status} /></td><td className="num">{g.kw}</td><td className="num">{fmt.num(g.impr)}</td><td className="num">{fmt.num(g.clicks)}</td><td className="num">{fmt.num(g.conv)}</td><td className="num">{fmt.eur2(g.cpa)}</td></tr>
                ))}
              </tbody>
            </table></div>
          </Card>
        )}

        {tab === "ads" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <RSACard c={c} />
            <LandingMatchCard c={c} />
          </div>
        )}

        {tab === "changes" && (
          <Card>
            <CardHead title="Wijzigingshistorie" desc="change_event · wie wat wanneer" />
            <div style={{ padding: "6px 18px 14px" }}>
              {changeEvents(c).map((e, i) => (
                <div key={i} className="row" style={{ gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid var(--border-soft)" : "none" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 7, background: "var(--surface-3)", display: "grid", placeItems: "center", color: "var(--fg-muted)", flexShrink: 0 }}><Icon d={e.icon} size={14} /></span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 550 }}>{e.text}</div><div style={{ fontSize: 11.5, color: "var(--fg-faint)" }}>{e.by} · {e.when}</div></div>
                  <Badge tone={e.tone}>{e.tag}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

interface AdGroupRow { name: string; status: string; kw: number; impr: number; clicks: number; conv: number; cpa: number; }
function adGroupsFor(c: Campaign, kws: Keyword[]): AdGroupRow[] {
  const names: Record<string, [string, Intent][]> = {
    "22041988127": [["Competitor — Wispr", "competitor"], ["Solution — Lokaal", "solution"]],
    "22041988201": [["Problem — Spraak", "problem"]], "22041988233": [["Brand — Exact", "brand"]],
    "22041988277": [["Solution — MKB", "solution"]], "22041988299": [["Local — Zorg", "local"]],
  };
  const groups = names[c.id] || ([["Algemeen", "problem"]] as [string, Intent][]);
  return groups.map(([name, intent]) => {
    const gk = kws.filter((k) => k.intent === intent);
    const impr = gk.reduce((s, k) => s + k.impressions, 0), clicks = gk.reduce((s, k) => s + k.clicks, 0), conv = gk.reduce((s, k) => s + k.conversions, 0), cost = gk.reduce((s, k) => s + k.cost_micros, 0);
    return { name, status: gk.length > 0 && gk.every((k) => k.status === "PAUSED") ? "PAUSED" : "ENABLED", kw: gk.length, impr, clicks, conv, cpa: conv ? cost / conv : 0 };
  });
}

function RSACard({ c }: { c: Campaign }) {
  const map: Record<string, { h: string[]; d: string[] }> = {
    "22041988127": { h: ["Wispr Flow alternatief", "Nu volledig lokaal & in het NL", "Dicteren.ai — privacy-proof"], d: ["Spraak naar tekst die op je eigen computer blijft. Geen cloud, geen VS.", "Probeer 14 dagen gratis. AVG-proof en AI-Agnostisch."] },
  };
  const ads = map[c.id] || { h: ["Spraak naar tekst — Nederlands", "Lokaal dicteren op je pc", "Dicteren.ai"], d: ["Werkt in elke app. Volledig lokaal en privacy-proof.", "Probeer 14 dagen gratis."] };
  return (
    <Card><CardHead title="Responsive Search Ad" desc="Koppen & beschrijvingen" icon="doc" />
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 7 }}>Koppen ({ads.h.length})</div>
        <div className="col" style={{ gap: 6 }}>{ads.h.map((h, i) => <div key={i} className="row" style={{ gap: 8, fontSize: 13 }}><Icon d="check" size={13} style={{ color: "var(--green)" }} />{h}</div>)}</div>
        <div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "14px 0 7px" }}>Beschrijvingen ({ads.d.length})</div>
        <div className="col" style={{ gap: 6 }}>{ads.d.map((d, i) => <div key={i} style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>{d}</div>)}</div>
      </div>
    </Card>
  );
}

function LandingMatchCard({ c }: { c: Campaign }) {
  const slug = c.id === "22041988127" ? "/lp/wispr-flow-alternatief" : c.id === "22041988233" ? "/" : "/lp/spraak-naar-tekst";
  const match = c.id === "22041988127" ? 0.94 : c.id === "22041988277" ? 0.71 : 0.86;
  return (
    <Card><CardHead title="Landingpagina · message-match" desc="Sluit de pagina aan op de advertentie?" icon="link" />
      <div style={{ padding: 18 }}>
        <div className="row" style={{ gap: 8, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
          <Icon d="globe" size={14} cls="soft" /><span className="mono" style={{ fontSize: 12.5 }}>dicteren.ai{slug}</span>
          <Btn variant="ghost" size="sm" iconRight="arrowUpRight" style={{ marginLeft: "auto" }}>Bekijk</Btn>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>Message-match score</span><span style={{ fontWeight: 700, color: match > 0.85 ? "var(--green)" : "var(--amber)" }}>{fmt.pct(match, 0)}</span></div>
          <MiniBar value={match} color={match > 0.85 ? "var(--green)" : "var(--amber)"} />
          <div style={{ fontSize: 12, color: "var(--fg-soft)", marginTop: 10, lineHeight: 1.5 }}>{match > 0.85 ? "Hero-kop matcht de advertentie. Wispr-vs-Dicteren-tabel + één CTA (trial) aanwezig. UTM-capture actief." : "Hero matcht deels. Overweeg de kop exact op de ad-tekst af te stemmen voor hogere conversie."}</div>
          <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <Badge tone="green"><Icon d="check" size={10} />Wispr-tabel</Badge>
            <Badge tone="green"><Icon d="check" size={10} />Eén CTA (trial)</Badge>
            <Badge tone="green"><Icon d="check" size={10} />UTM-capture</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ChangeRow { icon: string; text: string; by: string; when: string; tag: string; tone: string; }
function changeEvents(c: Campaign): ChangeRow[] {
  return [
    { icon: "wallet", text: "Dagbudget verhoogd van €25 naar €" + c.budget_micros / 1e6, by: "Christian", when: "28 jun · 09:40", tag: "Budget", tone: "amber" },
    { icon: "plus", text: "Keyword 'spraak naar tekst word' toegevoegd (PHRASE)", by: "Vicky → goedgekeurd", when: "27 jun · 08:15", tag: "Keyword", tone: "blue" },
    { icon: "ban", text: "Negative keyword 'gratis' toegevoegd op campagne-niveau", by: "Vicky → goedgekeurd", when: "26 jun · 11:20", tag: "Negative", tone: "red" },
    { icon: "play", text: "Campagne gestart", by: "Christian", when: fmt.dateLong(c.start_date), tag: "Status", tone: "green" },
  ];
}
