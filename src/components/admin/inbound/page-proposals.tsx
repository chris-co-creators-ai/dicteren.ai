"use client";
// Inbound — Voorstellen-historie. Full proposal list + status-FSM filters.
// Ported from page-proposals.jsx; window.DATA → data prop.
import { useState } from "react";
import { Icon } from "./icons";
import { Badge, Card, CardHead, IntentBadge, Select } from "./ui";
import { FSM_LABEL, FSM_TONE, TYPE_ICON, ProposalDialog } from "./proposals";
import { fmt } from "@/lib/inbound/format";
import { PROP_TYPES, INTENTS, type InboundData, type Proposal, type Intent } from "@/lib/inbound/data";
import type { InboundStore, NavFn } from "./types";

const DOT_COLOR: Record<string, string> = { muted: "var(--fg-soft)", blue: "var(--blue)", amber: "var(--amber)", green: "var(--green)", red: "var(--red)" };

export function PageProposals({ data, store, nav }: { data: InboundData; store: InboundStore; nav: NavFn }) {
  const [statusF, setStatusF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [detail, setDetail] = useState<Proposal | null>(null);

  const all = store.proposals;
  const filtered = all
    .filter((p) => (statusF === "all" || p.status === statusF) && (typeF === "all" || p.type === typeF))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    proposed: all.filter((p) => p.status === "proposed").length,
    approved: all.filter((p) => p.status === "approved").length,
    applied: all.filter((p) => p.status === "applied").length,
    rejected: all.filter((p) => p.status === "rejected").length,
  };

  function approve(p: Proposal) {
    store.setStatus(p.id, "approved");
    setTimeout(() => store.setStatus(p.id, "applied", { appliedAt: new Date().toISOString(), approvedBy: "Christian", resourceId: "customers/7132988127/" + p.type + "/" + Math.floor(Math.random() * 9e6) }), 1400);
    setDetail(null);
  }
  function reject(p: Proposal, note?: string) {
    store.setStatus(p.id, "rejected", { note, rejectedAt: new Date().toISOString(), approvedBy: "Christian" });
    setDetail(null);
  }

  return (
    <div className="stack">
      <div className="row">
        <div><h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Voorstellen-historie</h1><div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 3 }}>Alle voorstellen van Vicky met de status-FSM en het resultaat</div></div>
      </div>

      <div className="grid-kpi">
        {([["proposed", "Wacht op review", counts.proposed], ["approved", "Goedgekeurd", counts.approved], ["applied", "Toegepast", counts.applied], ["rejected", "Afgewezen", counts.rejected]] as [string, string, number][]).map(([s, l, n]) => (
          <button key={s} className="kpi" style={{ textAlign: "left", cursor: "pointer", outline: statusF === s ? "1.5px solid var(--ring)" : "none" }} onClick={() => setStatusF((f) => (f === s ? "all" : s))}>
            <div className="kpi-label"><span className="dot" style={{ width: 7, height: 7, borderRadius: 4, background: DOT_COLOR[FSM_TONE[s]] || "var(--fg-soft)" }} />{l}</div>
            <div className="kpi-val">{n}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHead title="Alle voorstellen" desc={filtered.length + " van " + all.length}
          right={<div className="row" style={{ gap: 8 }}>
            <Select value={statusF} width={150} onChange={setStatusF} options={[{ v: "all", l: "Alle statussen" }, ...Object.keys(FSM_LABEL).map((s) => ({ v: s, l: FSM_LABEL[s] }))]} />
            <Select value={typeF} width={160} onChange={setTypeF} options={[{ v: "all", l: "Alle types" }, ...Object.entries(PROP_TYPES).map(([k, t]) => ({ v: k, l: t.label }))]} />
          </div>} />
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>ID</th><th>Type</th><th>Voorstel</th><th>Intent</th><th>Aangemaakt</th><th>Door</th><th>Status</th><th className="num"></th></tr></thead>
          <tbody>
            {filtered.map((p) => {
              const T = PROP_TYPES[p.type];
              return (
                <tr key={p.id} className="clickable" onClick={() => setDetail(p)}>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--fg-soft)" }}>{p.id}</td>
                  <td><span className="row" style={{ gap: 7 }}><span style={{ color: "var(--fg-muted)" }}><Icon d={TYPE_ICON[p.type]} size={14} /></span><Badge tone={T.cls.replace("badge-", "")}>{T.label}</Badge></span></td>
                  <td style={{ maxWidth: 360, whiteSpace: "normal" }}><div style={{ fontWeight: 550, fontSize: 12.5, lineHeight: 1.4 }}>{p.proposal}</div></td>
                  <td>{p.rationale.intent && INTENTS[p.rationale.intent as Intent] ? <IntentBadge intent={p.rationale.intent as Intent} /> : <span className="faint">—</span>}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{fmt.dt(p.createdAt)}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{p.runId === "handmatig" ? "Handmatig" : <button className="mono" style={{ color: "var(--aqua-600)" }} onClick={(e) => { e.stopPropagation(); nav("vicky", p.runId); }}>{p.runId}</button>}</td>
                  <td><Badge tone={FSM_TONE[p.status]} dot>{FSM_LABEL[p.status]}</Badge></td>
                  <td className="num"><Icon d="chevRight" size={14} cls="faint" /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--fg-soft)", padding: 32 }}>Geen voorstellen voor dit filter.</td></tr>}
          </tbody>
        </table></div>
      </Card>

      {detail && <ProposalDialog p={store.proposals.find((x) => x.id === detail.id) || detail} onClose={() => setDetail(null)} onApprove={approve} onReject={reject} />}
    </div>
  );
}
