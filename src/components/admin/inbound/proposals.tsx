"use client";
// Inbound — Vicky's proposal feed + approval dialog + FSM stepper.
// Ported from proposals.jsx. The server-side approval gate (only status=approved
// is applied) is enforced in the real MCP/service layer; here it's the UI.
import { useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { Badge, Btn, Dialog } from "./ui";
import { PROP_TYPES, INTENTS, type Proposal, type ProposalStatus, type ProposalType } from "@/lib/inbound/data";

export const FSM: ProposalStatus[] = ["draft", "proposed", "approved", "applied"];
export const FSM_LABEL: Record<string, string> = { draft: "Concept", proposed: "Voorgesteld", approved: "Goedgekeurd", applied: "Toegepast", rejected: "Afgewezen" };
export const FSM_TONE: Record<string, string> = { draft: "muted", proposed: "blue", approved: "amber", applied: "green", rejected: "red" };
export const TYPE_ICON: Record<ProposalType, string> = { new_campaign: "megaphone", new_keyword: "plus", negative_keyword: "ban", budget_change: "wallet", pause: "pause", bid_change: "gauge" };

export function FSMTrack({ status }: { status: ProposalStatus }) {
  if (status === "rejected") {
    return <div className="row" style={{ gap: 6 }}><Badge tone="blue">Voorgesteld</Badge><Icon d="chevRight" size={12} cls="faint" /><Badge tone="red" dot>Afgewezen</Badge></div>;
  }
  const idx = FSM.indexOf(status);
  return (
    <div className="row" style={{ gap: 0 }}>
      {FSM.map((s, i) => (
        <span key={s} className="row" style={{ gap: 0 }}>
          <span className="row" style={{ gap: 5 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, display: "grid", placeItems: "center", background: i <= idx ? (s === "applied" ? "var(--green)" : "var(--orange)") : "var(--surface-3)", color: i <= idx ? "#0c1020" : "var(--fg-faint)", flexShrink: 0 }}>
              {i < idx || (i === idx && s === "applied") ? <Icon d="check" size={9} sw={3} /> : <span style={{ width: 4, height: 4, borderRadius: 2, background: "currentColor" }} />}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: i <= idx ? "var(--fg)" : "var(--fg-faint)" }}>{FSM_LABEL[s]}</span>
          </span>
          {i < FSM.length - 1 && <span style={{ width: 18, height: 1.5, margin: "0 7px", background: i < idx ? "var(--orange)" : "var(--border)", borderRadius: 2 }} />}
        </span>
      ))}
    </div>
  );
}

export function ProposalCard({ p, onApprove, onReject, onDetails, busy }: {
  p: Proposal; onApprove: (p: Proposal) => void; onReject: (p: Proposal, note?: string) => void; onDetails: (p: Proposal) => void; busy: boolean;
}) {
  const T = PROP_TYPES[p.type];
  const justApproved = p.status === "approved" || p.status === "applied";
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", transition: "opacity .3s, transform .3s", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: justApproved ? "var(--green)" : p.status === "rejected" ? "var(--red)" : "linear-gradient(90deg,var(--orange),var(--orange-600))" }} />
      <div style={{ padding: "15px 16px 0" }}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--surface-3)", display: "grid", placeItems: "center", color: "var(--fg-muted)" }}><Icon d={TYPE_ICON[p.type]} size={14} /></span>
          <Badge tone={T.cls.replace("badge-", "")}>{T.label}</Badge>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-faint)" }} className="mono">{p.id}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}><span style={{ color: "var(--fg-soft)", fontWeight: 600 }}>Bevinding · </span>{p.finding}</div>
        <div style={{ fontSize: 13.5, color: "var(--fg)", lineHeight: 1.5, marginTop: 8, fontWeight: 550 }}><span style={{ color: "var(--orange)" }}>Voorstel · </span>{p.proposal}</div>
      </div>

      <div style={{ display: "flex", gap: 0, margin: "13px 16px 0", borderTop: "1px solid var(--border-soft)", paddingTop: 11 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>Verwachte impact</div>
          <div style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 600, marginTop: 2 }}>{p.impact}</div>
        </div>
      </div>
      <div className="row" style={{ gap: 6, padding: "10px 16px", flexWrap: "wrap" }}>
        {p.rationale.keyword !== "—" && <span className="badge badge-muted" style={{ fontWeight: 500 }}><Icon d="search" size={10} />{p.rationale.keyword}</span>}
        <span className="badge badge-muted" style={{ fontWeight: 500 }}>{p.rationale.campaign}</span>
      </div>

      <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
        {p.status === "proposed" ? (
          <div className="row" style={{ gap: 8 }}>
            <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)} disabled={busy} style={{ flex: 1 }}>Akkoord</Btn>
            <Btn variant="outline" size="sm" onClick={() => onReject(p)} disabled={busy}>Afwijzen</Btn>
            <Btn variant="ghost" size="sm" onClick={() => onDetails(p)}>Details</Btn>
          </div>
        ) : (
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Badge tone={FSM_TONE[p.status]} dot>{p.status === "applied" ? "Toegepast" : p.status === "approved" ? "Wordt toegepast…" : FSM_LABEL[p.status]}</Badge>
            <Btn variant="ghost" size="sm" onClick={() => onDetails(p)}>Details</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, accent }: { label: string; children: ReactNode; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: accent ? "var(--fg)" : "var(--fg-muted)", fontWeight: accent ? 550 : 400 }}>{children}</div>
    </div>
  );
}
function Mini({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : "auto", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "9px 11px" }}>
      <div style={{ fontSize: 10.5, color: "var(--fg-faint)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--fg)", marginTop: 2 }}>{children}</div>
    </div>
  );
}

export function ProposalDialog({ p, onClose, onApprove, onReject }: {
  p: Proposal; onClose: () => void; onApprove: (p: Proposal) => void; onReject: (p: Proposal, note?: string) => void;
}) {
  const T = PROP_TYPES[p.type];
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  return (
    <Dialog onClose={onClose} wide>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="row" style={{ gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-3)", display: "grid", placeItems: "center", color: "var(--fg-muted)" }}><Icon d={TYPE_ICON[p.type]} size={16} /></span>
          <div><div className="row" style={{ gap: 8 }}><Badge tone={T.cls.replace("badge-", "")}>{T.label}</Badge><span className="mono faint" style={{ fontSize: 11 }}>{p.id}</span></div></div>
          <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto" }} onClick={onClose}><Icon d="x" size={16} /></button>
        </div>
        <div style={{ marginTop: 14 }}><FSMTrack status={p.status} /></div>
      </div>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "56vh", overflowY: "auto" }}>
        <Field label="Bevinding">{p.finding}</Field>
        <Field label="Voorstel" accent>{p.proposal}</Field>
        <Field label="Verwachte impact"><span style={{ color: "var(--green)", fontWeight: 600 }}>{p.impact}</span></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Mini label="Intent">{INTENTS[p.rationale.intent as keyof typeof INTENTS]?.label || "—"}</Mini>
          <Mini label="Keyword">{p.rationale.keyword}</Mini>
          <Mini label="Campagne" span>{p.rationale.campaign}</Mini>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 6 }}>Mutate-payload (server-side bewaakt)</div>
          <pre style={{ margin: 0, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "12px 14px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--aqua-600)", overflowX: "auto" }}>{JSON.stringify({ type: p.type, ...p.payload }, null, 2)}</pre>
        </div>
        {p.status === "applied" && p.resourceId && <Field label="Google Ads resource-id"><span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)", wordBreak: "break-all" }}>{p.resourceId}</span></Field>}
        {p.status === "rejected" && p.note && <Field label="Reden afwijzing"><span style={{ color: "var(--red)" }}>{p.note}</span></Field>}
        {rejecting && (
          <div>
            <div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 6 }}>Reden (optioneel)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Waarom wijs je dit af?" style={{ width: "100%", minHeight: 64, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--fg)", fontSize: 13, resize: "vertical" }} />
          </div>
        )}
      </div>
      {p.status === "proposed" && (
        <div className="row" style={{ gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
          {!rejecting ? (
            <>
              <div style={{ fontSize: 12, color: "var(--fg-soft)" }}>Server-side gate: alleen status <span className="mono">approved</span> wordt toegepast.</div>
              <Btn variant="outline" size="sm" style={{ marginLeft: "auto" }} onClick={() => setRejecting(true)}>Afwijzen</Btn>
              <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)}>Akkoord geven</Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => setRejecting(false)}>Annuleer</Btn>
              <Btn variant="danger" size="sm" onClick={() => onReject(p, note)}>Bevestig afwijzing</Btn>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
