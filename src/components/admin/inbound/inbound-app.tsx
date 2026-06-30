"use client";
// Inbound — client app shell. Ported from app.jsx, minus the prototype's own
// sidebar (Inbound lives inside the real admin layout). Provides the topbar
// (NL-geo badge + sync), sub-tab nav, token banner, proposal store, and routing.
import { useState, useEffect, useCallback } from "react";
import { Icon } from "./icons";
import { Badge, Btn } from "./ui";
import { PageOverview } from "./page-overview";
import { PageCampaign } from "./page-campaign";
import { PageKeywords } from "./page-keywords";
import { PageProposals } from "./page-proposals";
import { PageVicky } from "./page-vicky";
import { fmt } from "@/lib/inbound/format";
import type { InboundData, Proposal, ProposalStatus } from "@/lib/inbound/data";
import type { InboundStore, NavFn, Page } from "./types";

const SUBNAV: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "Overzicht", icon: "megaphone" },
  { id: "keywords", label: "Keywords & intent", icon: "search" },
  { id: "proposals", label: "Voorstellen", icon: "list" },
  { id: "vicky", label: "Vicky-console", icon: "cpu" },
];
const TITLES: Record<string, string> = { overview: "Overzicht", campaign: "Campagne", keywords: "Keywords & intent", proposals: "Voorstellen", vicky: "Vicky-console" };

function useInboundStore(initial: Proposal[]): InboundStore & { toasts: { id: string; msg: string }[] } {
  const [proposals, setProposals] = useState<Proposal[]>(() => initial.map((p) => ({ ...p })));
  const [session, setSession] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  const setStatus = useCallback((id: string, status: ProposalStatus, extra: Partial<Proposal> = {}) => {
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, status, ...extra } : p)));
    setSession((s) => new Set(s).add(id));
  }, []);
  const addProposal = useCallback((p: Proposal) => setProposals((ps) => [p, ...ps]), []);
  const toast = useCallback((msg: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return { proposals, session, setStatus, addProposal, toast, toasts };
}

export function InboundApp({ data }: { data: InboundData }) {
  const [route, setRoute] = useState<{ page: Page; arg: string | null }>({ page: "overview", arg: null });
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(data.account.lastSync);
  const [tokenBanner, setTokenBanner] = useState(data.account.tokenAccess === "test");
  const store = useInboundStore(data.proposals);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const nav: NavFn = useCallback((page, arg = null) => {
    setRoute({ page, arg });
    window.scrollTo(0, 0);
  }, []);

  function doSync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toISOString());
      store.toast("Sync voltooid · data ge-update uit Neon");
    }, 1500);
  }

  const pending = store.proposals.filter((p) => p.status === "proposed").length;
  const curCampaign = data.campaigns.find((c) => c.id === route.arg);

  return (
    <div className="main" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header className="topbar">
        <div className="crumbs">
          <span>Admin</span><span className="sep">/</span>
          <button onClick={() => nav("overview")} style={{ color: route.page === "overview" ? "var(--fg)" : "var(--fg-soft)" }}>Inbound</button>
          {route.page === "campaign" && <><span className="sep">/</span><span className="cur">{curCampaign?.name || "Campagne"}</span></>}
          {route.page !== "overview" && route.page !== "campaign" && <><span className="sep">/</span><span className="cur">{TITLES[route.page]}</span></>}
        </div>
        <div className="topbar-spacer" />
        <Badge tone="green"><Icon d="globe" size={11} />NL-geo actief</Badge>
        <button className="select" style={{ gap: 7 }} onClick={doSync} disabled={syncing}>
          <span style={{ display: "inline-flex", color: syncing ? "var(--aqua-600)" : "var(--green)" }} className={syncing ? "spin" : ""}><Icon d="sync" size={13} /></span>
          <span style={{ fontSize: 12.5 }}>{syncing ? "Synct…" : lastSync ? "Gesynct " + fmt.time(lastSync) : "Nog niet gesynct"}</span>
        </button>
      </header>

      <div className="content">
        {tokenBanner && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: "var(--amber-bg)", border: "1px solid var(--amber-bd)", borderRadius: 12, marginBottom: 18 }}>
            <Icon d="alert" size={16} style={{ color: "var(--amber)", flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
              <strong style={{ color: "var(--fg)" }}>Google Ads API: alleen test-toegang.</strong> Live-sync en write zijn gepauzeerd tot het developer-token Basic access heeft (aangevraagd via API Center). Campagne #1 draait handmatig met onze tracking eronder. Data hieronder is voorbeelddata.
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setTokenBanner(false)} style={{ marginLeft: "auto" }}><Icon d="x" size={14} /></Btn>
          </div>
        )}

        {/* Sub-nav */}
        <div className="row" style={{ marginBottom: 18 }}>
          <div className="subnav">
            {SUBNAV.map((n) => {
              const active = route.page === n.id || (n.id === "overview" && route.page === "campaign");
              return (
                <button key={n.id} className={active ? "active" : ""} onClick={() => nav(n.id)}>
                  <Icon d={n.icon} size={15} />{n.label}
                  {n.id === "proposals" && pending > 0 && <span className="badge-count" style={{ marginLeft: 2 }}>{pending}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <Skeletons />
        ) : route.page === "overview" ? (
          <PageOverview data={data} period={period} setPeriod={setPeriod} store={store} nav={nav} />
        ) : route.page === "campaign" ? (
          <PageCampaign data={data} id={route.arg} period={period} setPeriod={setPeriod} nav={nav} store={store} />
        ) : route.page === "keywords" ? (
          <PageKeywords data={data} nav={nav} />
        ) : route.page === "proposals" ? (
          <PageProposals data={data} store={store} nav={nav} />
        ) : route.page === "vicky" ? (
          <PageVicky data={data} focusRun={route.arg} nav={nav} />
        ) : null}
      </div>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 300, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {store.toasts.map((t) => (
          <div key={t.id} style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 16px", boxShadow: "var(--shadow-pop)", fontSize: 13, display: "flex", alignItems: "center", gap: 9 }}>
            <Icon d="check" size={15} style={{ color: "var(--green)" }} />{t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeletons() {
  return (
    <div className="stack">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 14 }}>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
      </div>
      <div className="grid-kpi">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 92, borderRadius: 16 }} />)}</div>
      <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
    </div>
  );
}
