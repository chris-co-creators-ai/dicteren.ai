"use client";
// Inbound — Vicky-console. Read-only observability (agent_runs / agent_steps),
// same pattern as the existing Pi-console. Ported from page-vicky.jsx.
import { useState } from "react";
import { Icon } from "./icons";
import { Badge, Btn, Card, CardHead } from "./ui";
import { fmt } from "@/lib/inbound/format";
import type { InboundData } from "@/lib/inbound/data";
import type { NavFn } from "./types";

export function PageVicky({ data, focusRun, nav }: { data: InboundData; focusRun: string | null; nav: NavFn }) {
  const [sel, setSel] = useState(focusRun || data.vickyRuns[0]?.id || "");
  const run = data.vickyRuns.find((r) => r.id === sel) || data.vickyRuns[0];

  if (!run) {
    return (
      <div className="stack">
        <div className="row" style={{ gap: 11 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,var(--orange),var(--orange-600))", display: "grid", placeItems: "center", color: "#fff" }}><Icon d="cpu" size={18} /></span>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Vicky-console</h1><div style={{ fontSize: 13, color: "var(--fg-soft)" }}>PPC/CRO-agent · read-only observability (agent_runs / agent_steps)</div></div>
        </div>
        <Card>
          <div className="empty">
            <div className="empty-ic"><Icon d="cpu" size={22} /></div>
            <div className="empty-title">Vicky heeft nog niet gedraaid</div>
            <div className="empty-sub">Zodra de ochtend-loop start, verschijnen haar runs en stappen hier.</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row">
        <div className="row" style={{ gap: 11 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,var(--orange),var(--orange-600))", display: "grid", placeItems: "center", color: "#1a0e05" }}><Icon d="cpu" size={18} /></span>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Vicky-console</h1><div style={{ fontSize: 13, color: "var(--fg-soft)" }}>PPC/CRO-agent · read-only observability (agent_runs / agent_steps)</div></div>
        </div>
        <div className="row" style={{ gap: 8, marginLeft: "auto" }}>
          <Badge tone="green" dot>Actief · volgende run 07:00</Badge>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>
        {/* Runs list */}
        <Card style={{ overflow: "hidden" }}>
          <CardHead title="Runs" desc={data.vickyRuns.length + " recente runs"} />
          <div>
            {data.vickyRuns.map((r) => (
              <button key={r.id} onClick={() => setSel(r.id)} style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border-soft)", background: r.id === sel ? "var(--surface-2)" : "transparent", borderLeft: r.id === sel ? "2px solid var(--orange)" : "2px solid transparent" }}>
                <div className="row" style={{ justifyContent: "space-between" }}><span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{r.id}</span><Badge tone="green">{r.status === "completed" ? "Klaar" : r.status}</Badge></div>
                <div style={{ fontSize: 11.5, color: "var(--fg-soft)", marginTop: 4 }}>{fmt.dt(r.startedAt)}</div>
                <div className="row" style={{ gap: 10, marginTop: 6 }}><span className="row faint" style={{ fontSize: 11, gap: 4 }}><Icon d="clock" size={11} />{Math.floor(r.durationSec / 60)}m {r.durationSec % 60}s</span><span className="row faint" style={{ fontSize: 11, gap: 4 }}><Icon d="list" size={11} />{r.proposals} voorstellen</span></div>
              </button>
            ))}
          </div>
        </Card>

        {/* Run detail */}
        <div className="stack" style={{ gap: 16 }}>
          <Card pad>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="row" style={{ gap: 9 }}><span className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{run.id}</span><Badge tone="green" dot>Voltooid</Badge></div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 8, lineHeight: 1.55, maxWidth: 640 }}>{run.summary}</div>
              </div>
              <Btn variant="outline" size="sm" icon="list" onClick={() => nav("proposals")}>Voorstellen</Btn>
            </div>
            <div className="row" style={{ gap: 24, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
              {([["Gestart", fmt.dt(run.startedAt)], ["Duur", Math.floor(run.durationSec / 60) + "m " + (run.durationSec % 60) + "s"], ["Stappen", String(run.steps.length || "—")], ["Voorstellen", String(run.proposals)]] as [string, string][]).map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 10.5, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
              ))}
            </div>
          </Card>

          {run.steps.length > 0 ? (
            <Card>
              <CardHead title="Stappen" desc="agent_steps · withStep-logging" icon="activity" />
              <div style={{ padding: "8px 18px 16px" }}>
                {run.steps.map((s, i) => (
                  <div key={s.n} className="row" style={{ gap: 13, padding: "12px 0", alignItems: "flex-start", borderBottom: i < run.steps.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                    <div className="col" style={{ alignItems: "center", gap: 0 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 12, background: "var(--green-bg)", border: "1px solid var(--green-bd)", display: "grid", placeItems: "center", color: "var(--green)", flexShrink: 0 }}><Icon d="check" size={12} sw={3} /></span>
                      {i < run.steps.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 14, background: "var(--border)", marginTop: 2 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 2 }}>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}><span className="mono faint" style={{ fontSize: 11, marginRight: 8 }}>{String(s.n).padStart(2, "0")}</span>{s.label}</span>
                        <span className="mono faint" style={{ fontSize: 11 }}>{(s.ms / 1000).toFixed(1)}s</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--fg-soft)", marginTop: 3 }}>{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 36, textAlign: "center", color: "var(--fg-soft)" }}>
              <Icon d="activity" size={22} cls="faint" style={{ marginBottom: 8 }} /><div style={{ fontSize: 13 }}>Stap-logs van deze run zijn gearchiveerd.</div>
            </Card>
          )}

          <Card pad style={{ background: "var(--surface-2)" }}>
            <div className="row" style={{ gap: 10 }}>
              <Icon d="shield" size={16} cls="soft" />
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>Vicky leest live via de officiële Google Ads MCP (read-only) en schrijft <strong style={{ color: "var(--fg)" }}>nooit</strong> rechtstreeks. Elke mutatie loopt als voorstel langs de approval-gate.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
