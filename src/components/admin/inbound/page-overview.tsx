"use client";
// Inbound — Overzicht. Vicky's proposal feed on top, account KPIs, campaign table.
// Ported from page-overview.jsx; window.DATA → `data` prop.
import { useState, useMemo, type ReactNode } from "react";
import { Icon } from "./icons";
import { Btn, Card, CardHead, StatusBadge, Delta, PeriodSelect } from "./ui";
import { Sparkline, MiniBar } from "./charts";
import { ProposalCard, ProposalDialog } from "./proposals";
import { fmt } from "@/lib/inbound/format";
import type { InboundData, Proposal, Campaign } from "@/lib/inbound/data";
import type { InboundStore, NavFn } from "./types";

function KpiTile({ label, icon, value, cur, prev, invert, sub }: {
  label: string; icon: string; value: string; cur?: number; prev?: number | null; invert?: boolean; sub?: ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label"><Icon d={icon} size={14} />{label}</div>
      <div className="kpi-val">{value}</div>
      {prev != null && cur != null ? <Delta cur={cur} prev={prev} invert={invert} /> : sub ? <div className="kpi-delta"><span className="vs" style={{ marginLeft: 0 }}>{sub}</span></div> : null}
    </div>
  );
}

type SortKey = "name" | "status" | "budget" | "impr" | "clicks" | "ctr" | "cost" | "conv" | "cpa" | "is";

export function PageOverview({ data, period, setPeriod, store, nav }: {
  data: InboundData; period: string; setPeriod: (v: string) => void; store: InboundStore; nav: NavFn;
}) {
  const [detail, setDetail] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "cost", dir: "desc" });
  const k = data.account.kpis;

  const pending = store.proposals.filter((p) => p.status === "proposed");
  const recentlyActioned = store.proposals.filter((p) => (p.status === "approved" || p.status === "applied") && store.session.has(p.id));

  function approve(p: Proposal) {
    setBusy(true);
    setDetail(null);
    store.setStatus(p.id, "approved");
    setTimeout(() => {
      store.setStatus(p.id, "applied", { appliedAt: new Date().toISOString(), approvedBy: "Christian", resourceId: "customers/7132988127/" + p.type + "/" + Math.floor(Math.random() * 9e6) });
      setBusy(false);
    }, 1400);
  }
  function reject(p: Proposal, note?: string) {
    store.setStatus(p.id, "rejected", { note, rejectedAt: new Date().toISOString(), approvedBy: "Christian" });
    setDetail(null);
  }

  const rows = useMemo(() => {
    const arr = [...data.campaigns];
    const get = (c: Campaign): string | number => ({
      name: c.name, status: c.status, type: c.advertising_channel_type, budget: c.budget_micros,
      impr: c.metrics.impressions, clicks: c.metrics.clicks, ctr: c.metrics.ctr, cost: c.metrics.cost_micros,
      conv: c.metrics.conversions, cvr: c.metrics.conversions_from_interactions_rate,
      cpa: c.metrics.cost_per_conversion_micros, is: c.metrics.search_impression_share,
    })[sort.key] as string | number;
    arr.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (typeof av === "string" && typeof bv === "string") return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [sort, data.campaigns]);

  function Th({ k: key, children, num }: { k: SortKey; children: ReactNode; num?: boolean }) {
    const active = sort.key === key;
    return (
      <th className={(num ? "num " : "") + "sortable"} onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}>
        {children}{active && <Icon d={sort.dir === "desc" ? "arrowDown" : "arrowUp"} size={11} cls="th-sort-ic" />}
      </th>
    );
  }

  return (
    <div className="stack">
      {/* Proposals feed */}
      <div>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-0.01em" }} className="row">
            <span style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,var(--orange),var(--orange-600))", display: "grid", placeItems: "center", color: "#1a0e05", marginRight: 9 }}><Icon d="cpu" size={14} /></span>
            Voorstellen van Vicky
          </h2>
          {pending.length > 0 && <span className="badge-count" style={{ marginLeft: 10 }}>{pending.length}</span>}
          <span style={{ marginLeft: "auto" }} className="row">
            <Btn variant="ghost" size="sm" icon="list" onClick={() => nav("proposals")}>Volledige historie</Btn>
          </span>
        </div>

        {pending.length === 0 && recentlyActioned.length === 0 ? (
          <Card style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--surface-3)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "var(--green)" }}><Icon d="check" size={22} /></div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Vicky heeft niks nieuws</div>
            <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4 }}>Alle voorstellen afgehandeld. Volgende run morgen om 07:00.</div>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 }}>
            {pending.map((p) => <ProposalCard key={p.id} p={p} busy={busy} onApprove={approve} onReject={reject} onDetails={setDetail} />)}
            {recentlyActioned.map((p) => <ProposalCard key={p.id} p={p} busy={busy} onApprove={approve} onReject={reject} onDetails={setDetail} />)}
          </div>
        )}
      </div>

      {/* KPI tiles */}
      <div>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 650 }}>Account-prestaties</h2>
          <span style={{ marginLeft: "auto" }}><PeriodSelect value={period} onChange={setPeriod} /></span>
        </div>
        <div className="grid-kpi">
          <KpiTile label="Impressies" icon="eye" value={fmt.num(k.impressions.v)} cur={k.impressions.v} prev={k.impressions.prev} />
          <KpiTile label="Klikken" icon="target" value={fmt.num(k.clicks.v)} cur={k.clicks.v} prev={k.clicks.prev} />
          <KpiTile label="Conversies" icon="check" value={fmt.num1(k.conversions.v)} cur={k.conversions.v} prev={k.conversions.prev} />
          <KpiTile label="Kosten" icon="wallet" value={fmt.eur(k.cost_micros.v)} cur={k.cost_micros.v} prev={k.cost_micros.prev} invert />
        </div>
        <div className="grid-kpi-5" style={{ marginTop: 14 }}>
          <KpiTile label="CTR" icon="target" value={fmt.pct(k.ctr.v)} cur={k.ctr.v} prev={k.ctr.prev} />
          <KpiTile label="Gem. CPC" icon="wallet" value={fmt.eur2(k.average_cpc_micros.v)} cur={k.average_cpc_micros.v} prev={k.average_cpc_micros.prev} invert />
          <KpiTile label="Conv-rate" icon="trend" value={fmt.pct(k.conversions_from_interactions_rate.v)} cur={k.conversions_from_interactions_rate.v} prev={k.conversions_from_interactions_rate.prev} />
          <KpiTile label="CPA" icon="gauge" value={fmt.eur2(k.cost_per_conversion_micros.v)} cur={k.cost_per_conversion_micros.v} prev={k.cost_per_conversion_micros.prev} invert />
          <KpiTile label="Impr. share" icon="spark" value={fmt.pct(k.search_impression_share.v, 0)} cur={k.search_impression_share.v} prev={k.search_impression_share.prev} />
        </div>
      </div>

      {/* Campaign table */}
      <Card>
        <CardHead title="Campagnes" desc={data.campaigns.length + " campagnes · NL-geo · gesynct uit Neon"} icon="megaphone"
          right={<Btn variant="outline" size="sm" icon="filter">Filter</Btn>} />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <Th k="name">Campagne</Th><Th k="status">Status</Th><Th k="budget" num>Budget/dag</Th>
              <Th k="impr" num>Impr.</Th><Th k="clicks" num>Clicks</Th><Th k="ctr" num>CTR</Th><Th k="cost" num>Kosten</Th>
              <Th k="conv" num>Conv.</Th><Th k="cpa" num>CPA</Th><Th k="is" num>Impr. share</Th>
              <th className="num">14d trend</th>
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={"clickable" + (c.status === "PAUSED" ? " dimmed" : "")} onClick={() => nav("campaign", c.id)}>
                  <td><div style={{ fontWeight: 600, color: "var(--fg)" }}>{c.name}</div><div className="mono" style={{ fontSize: 11, color: "var(--fg-faint)" }}>{c.bidding_strategy_type}</div></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="num">{fmt.eur(c.budget_micros)}</td>
                  <td className="num">{fmt.num(c.metrics.impressions)}</td>
                  <td className="num">{fmt.num(c.metrics.clicks)}</td>
                  <td className="num">{fmt.pct(c.metrics.ctr)}</td>
                  <td className="num">{fmt.eur(c.metrics.cost_micros)}</td>
                  <td className="num">{fmt.num1(c.metrics.conversions)}</td>
                  <td className="num"><span style={{ color: c.metrics.cost_per_conversion_micros > 50e6 ? "var(--red)" : c.metrics.cost_per_conversion_micros < 15e6 ? "var(--green)" : "var(--fg)" }}>{fmt.eur2(c.metrics.cost_per_conversion_micros)}</span></td>
                  <td className="num"><div style={{ width: 70, marginLeft: "auto" }}><MiniBar value={c.metrics.search_impression_share} color="var(--aqua-600)" /></div></td>
                  <td><div style={{ display: "flex", justifyContent: "flex-end" }}><Sparkline data={c.series.slice(-14).map((s) => s.cost_micros / 1e6)} color={c.status === "PAUSED" ? "var(--fg-faint)" : "var(--orange)"} /></div></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    <div className="empty-ic"><Icon d="megaphone" size={22} /></div>
                    <div className="empty-title">Nog geen campagnes</div>
                    <div className="empty-sub">Zodra de Google Ads-sync draait (na Basic-access op het token) verschijnen je campagnes hier.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {detail && <ProposalDialog p={store.proposals.find((x) => x.id === detail.id) || detail} onClose={() => setDetail(null)} onApprove={approve} onReject={reject} />}
    </div>
  );
}
