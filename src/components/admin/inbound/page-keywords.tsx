"use client";
// Inbound — Keywords & intent (cross-campagne, gegroepeerd per intent-cluster).
// Ported from page-keywords.jsx; window.DATA → data prop.
import { useState } from "react";
import { Icon } from "./icons";
import { Badge, Card, StatusBadge, IntentBadge, MatchBadge, QScore, Select } from "./ui";
import { MiniBar } from "./charts";
import { fmt } from "@/lib/inbound/format";
import { INTENTS, type InboundData, type Intent } from "@/lib/inbound/data";
import type { NavFn } from "./types";

function Metric({ label, v, tone }: { label: string; v: string; tone?: string | null }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 10, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: tone || "var(--fg)" }}>{v}</div>
    </div>
  );
}

export function PageKeywords({ data, nav }: { data: InboundData; nav: NavFn }) {
  const [campF, setCampF] = useState("all");
  const [matchF, setMatchF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set(Object.keys(INTENTS)));

  const campName = (id: string) => data.campaigns.find((c) => c.id === id)?.name || id;
  const filtered = data.keywords.filter((k) => (campF === "all" || k.campaignId === campF) && (matchF === "all" || k.match_type === matchF) && (statusF === "all" || k.status === statusF));

  const clusters = (Object.keys(INTENTS) as Intent[]).map((intent) => {
    const items = filtered.filter((k) => k.intent === intent);
    const cost = items.reduce((s, k) => s + k.cost_micros, 0);
    const conv = items.reduce((s, k) => s + k.conversions, 0);
    const clicks = items.reduce((s, k) => s + k.clicks, 0);
    const impr = items.reduce((s, k) => s + k.impressions, 0);
    return { intent, items, cost, conv, clicks, impr, cpa: conv ? cost / conv : 0, info: INTENTS[intent] };
  }).filter((c) => c.items.length);

  const totals = clusters.reduce((a, c) => ({ cost: a.cost + c.cost, conv: a.conv + c.conv }), { cost: 0, conv: 0 });

  function toggle(intent: string) {
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(intent)) n.delete(intent); else n.add(intent);
      return n;
    });
  }

  return (
    <div className="stack">
      <div className="row">
        <div><h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Keywords &amp; intent</h1><div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 3 }}>Alle keywords cross-campagne, gegroepeerd per intent-cluster</div></div>
        <div className="row" style={{ gap: 8, marginLeft: "auto" }}>
          <Select value={campF} width={210} onChange={setCampF} options={[{ v: "all", l: "Alle campagnes" }, ...data.campaigns.map((c) => ({ v: c.id, l: c.name.replace("NL · ", "") }))]} />
          <Select value={matchF} width={130} onChange={setMatchF} options={[{ v: "all", l: "Alle match" }, { v: "EXACT", l: "Exact" }, { v: "PHRASE", l: "Phrase" }, { v: "BROAD", l: "Broad" }]} />
          <Select value={statusF} width={140} onChange={setStatusF} options={[{ v: "all", l: "Alle statussen" }, { v: "ENABLED", l: "Actief" }, { v: "PAUSED", l: "Gepauzeerd" }]} />
        </div>
      </div>

      {/* Intent summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${clusters.length || 1}, 1fr)`, gap: 12 }}>
        {clusters.map((c) => (
          <button key={c.intent} className="kpi" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => toggle(c.intent)}>
            <div className="row" style={{ justifyContent: "space-between" }}><IntentBadge intent={c.intent} /><span className="mono faint" style={{ fontSize: 11 }}>{c.items.length} kw</span></div>
            <div style={{ fontSize: 20, fontWeight: 720, letterSpacing: "-0.02em", marginTop: 10 }}>{fmt.eur2(c.cpa)}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-soft)" }}>CPA · {fmt.num1(c.conv)} conv · {fmt.eur(c.cost)}</div>
            <div style={{ marginTop: 8 }}><MiniBar value={totals.cost ? c.cost / totals.cost : 0} color={c.info.color} label /></div>
          </button>
        ))}
      </div>

      {/* Clusters */}
      <div className="stack" style={{ gap: 12 }}>
        {clusters.map((c) => (
          <Card key={c.intent} style={{ overflow: "hidden" }}>
            <button className="card-head" style={{ width: "100%", cursor: "pointer", background: "transparent" }} onClick={() => toggle(c.intent)}>
              <span className="intent-bar" style={{ background: c.info.color, height: 22 }} />
              <Icon d={open.has(c.intent) ? "chevDown" : "chevRight"} size={15} cls="soft" />
              <div className="card-title">{c.info.label}-cluster</div>
              <Badge tone="muted" style={{ marginLeft: 4 }}>{c.items.length} keywords</Badge>
              <div className="row" style={{ marginLeft: "auto", gap: 20 }}>
                <Metric label="Impr." v={fmt.num(c.impr)} /><Metric label="Clicks" v={fmt.num(c.clicks)} /><Metric label="Conv." v={fmt.num1(c.conv)} /><Metric label="Kosten" v={fmt.eur(c.cost)} /><Metric label="CPA" v={fmt.eur2(c.cpa)} tone={c.cpa > 50e6 ? "var(--red)" : c.cpa < 15e6 ? "var(--green)" : null} />
              </div>
            </button>
            {open.has(c.intent) && (
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Keyword</th><th>Campagne</th><th>Match</th><th className="num">Q-score</th><th className="num">Impr.</th><th className="num">Clicks</th><th className="num">CTR</th><th className="num">CPC</th><th className="num">Conv.</th><th className="num">CPA</th><th>Status</th></tr></thead>
                <tbody>
                  {c.items.map((k) => (
                    <tr key={k.id} className={"clickable" + (k.status === "PAUSED" ? " dimmed" : "")} onClick={() => nav("campaign", k.campaignId)}>
                      <td style={{ fontWeight: 550 }}>{k.text}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{campName(k.campaignId).replace("NL · ", "")}</td>
                      <td><MatchBadge m={k.match_type} /></td><td className="num"><QScore v={k.quality_score} /></td>
                      <td className="num">{fmt.num(k.impressions)}</td><td className="num">{fmt.num(k.clicks)}</td><td className="num">{fmt.pct(k.ctr)}</td><td className="num">{fmt.eur2(k.cpc_micros)}</td><td className="num">{fmt.num(k.conversions)}</td>
                      <td className="num"><span style={{ color: k.cpa_micros > 50e6 ? "var(--red)" : k.cpa_micros < 15e6 ? "var(--green)" : "var(--fg)" }}>{fmt.eur2(k.cpa_micros)}</span></td>
                      <td><StatusBadge status={k.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Card>
        ))}
        {clusters.length === 0 && <Card style={{ padding: 40, textAlign: "center", color: "var(--fg-soft)" }}>Geen keywords voor dit filter.</Card>}
      </div>
    </div>
  );
}
