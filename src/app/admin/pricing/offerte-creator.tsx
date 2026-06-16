"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Download, FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PRICING,
  perSeatCentsForPeriod,
  type PricingSnapshot,
  type BillingPeriod,
} from "@/lib/services/pricingTiers";
import {
  buildStandardLineItems,
  computeOfferteTotals,
  defaultValidUntil,
  euroCents,
  DEFAULT_OFFERTE_INTRO,
  DEFAULT_OFFERTE_CLOSING,
  type OfferteLineItem,
  type OffertePeriod,
} from "@/lib/services/offerteShared";

// Offerte-creator voor zakelijke eindklanten. Kiest een CRM-organisatie, rekent
// met dezelfde staffel/BTW-logica als checkout en levert een nette PDF die per
// klant wordt opgeslagen. Geen nieuwe prijslogica — alles uit pricingTiers.ts.

type OrgListItem = {
  id: string;
  name: string;
  city?: string | null;
  kvk?: string | null;
  status?: string | null;
};

type OrgDetail = {
  id: string;
  name: string;
  kvk: string | null;
  vatNumber: string | null;
  city: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  proposedSeats: number | null;
};

type ExtraLine = { description: string; qty: string; unitEur: string };

const PERIOD_LABELS: Record<OffertePeriod, string> = {
  monthly: "Maand",
  quarterly: "Kwartaal",
  yearly: "Jaar",
};

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2);
}
function eurToCents(eur: string): number {
  const n = Number(String(eur).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function OfferteCreator({ initialOrgId }: { initialOrgId?: string | null }) {
  const [pricing, setPricing] = useState<PricingSnapshot>(DEFAULT_PRICING);
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [query, setQuery] = useState("");
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // Calculator-invoer
  const [seats, setSeats] = useState(5);
  const [period, setPeriod] = useState<OffertePeriod>("yearly");
  const [unitOverrideEur, setUnitOverrideEur] = useState(""); // leeg = staffelprijs
  const [stdDescription, setStdDescription] = useState("");
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([]);

  // Offerte-tekst
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [introText, setIntroText] = useState(DEFAULT_OFFERTE_INTRO);
  const [closingText, setClosingText] = useState(DEFAULT_OFFERTE_CLOSING);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: string; quoteNumber: string } | null>(null);

  // Live prijs-config + org-lijst ophalen.
  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) setPricing(d.data as PricingSnapshot);
      })
      .catch(() => {});
    fetch("/api/admin/crm/organizations")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) setOrgs(d.data as OrgListItem[]);
      })
      .catch(() => {});
  }, []);

  const selectOrg = useCallback(async (orgId: string) => {
    setLoadingOrg(true);
    try {
      const res = await fetch(`/api/admin/crm/organizations/${orgId}`);
      const d = await res.json();
      if (d?.success && d.data) {
        const o = d.data as OrgDetail;
        setOrg(o);
        setCreated(null);
        if (o.proposedSeats && o.proposedSeats > 0) setSeats(o.proposedSeats);
      } else {
        toast.error("Organisatie laden mislukt");
      }
    } finally {
      setLoadingOrg(false);
    }
  }, []);

  // Deep-link ?org= → meteen selecteren.
  useEffect(() => {
    if (initialOrgId) void selectOrg(initialOrgId);
  }, [initialOrgId, selectOrg]);

  // Standaard-omschrijving (her)opbouwen wanneer seats/periode wijzigen.
  useEffect(() => {
    const [line] = buildStandardLineItems(pricing, seats, period);
    setStdDescription(line.description);
  }, [pricing, seats, period]);

  const autoUnitCents = perSeatCentsForPeriod(pricing, seats, period as BillingPeriod);
  const isCustom = seats >= pricing.customQuoteFrom;
  const overrideCents = unitOverrideEur.trim() ? eurToCents(unitOverrideEur) : null;
  const effectiveUnit = overrideCents ?? autoUnitCents;

  const lineItems: OfferteLineItem[] = useMemo(() => {
    const std: OfferteLineItem = {
      description: stdDescription || "Dicteren.ai zakelijk",
      qty: seats,
      unitNetCents: effectiveUnit,
      netCents: effectiveUnit * seats,
    };
    const extras: OfferteLineItem[] = extraLines
      .filter((l) => l.description.trim())
      .map((l) => {
        const qty = Math.max(0, Number(l.qty) || 0);
        const unit = eurToCents(l.unitEur);
        return { description: l.description.trim(), qty, unitNetCents: unit, netCents: qty * unit };
      });
    return [std, ...extras];
  }, [stdDescription, seats, effectiveUnit, extraLines]);

  const totals = useMemo(() => computeOfferteTotals(lineItems), [lineItems]);

  const maatwerkPriceMissing = isCustom && !overrideCents;

  function addExtraLine() {
    setExtraLines((p) => [...p, { description: "", qty: "1", unitEur: "" }]);
  }
  function setExtra(i: number, patch: Partial<ExtraLine>) {
    setExtraLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeExtra(i: number) {
    setExtraLines((p) => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!org) {
      toast.error("Kies eerst een organisatie");
      return;
    }
    if (maatwerkPriceMissing) {
      toast.error("Vul een prijs per seat in voor deze maatwerk-offerte");
      return;
    }
    if (totals.netCents <= 0) {
      toast.error("De offerte heeft nog geen bedrag");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/crm/organizations/${org.id}/offertes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seats,
          period,
          lineItems,
          validUntil,
          introText,
          closingText,
          notes: notes.trim() || null,
        }),
      });
      const d = await res.json();
      if (!d?.success) {
        toast.error(d?.error ?? "Offerte opslaan mislukt");
        return;
      }
      setCreated({ id: d.data.id, quoteNumber: d.data.quoteNumber });
      toast.success(`Offerte ${d.data.quoteNumber} opgeslagen bij ${org.name}`);
    } catch {
      toast.error("Offerte opslaan mislukt (netwerkfout)");
    } finally {
      setSaving(false);
    }
  }

  const filtered = orgs
    .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      {/* ───── Linker kolom: opbouw ───── */}
      <div className="space-y-4">
        {/* Organisatie kiezen */}
        <div className="brand-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Search className="size-4" style={{ color: "var(--navy)" }} strokeWidth={2.2} />
            <h3 className="text-sm font-bold text-[color:var(--navy)]">Klant uit CRM</h3>
          </div>
          {org ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-3">
              <div className="text-sm">
                <div className="font-bold text-[color:var(--navy)]">{org.name}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {[org.kvk ? `KvK ${org.kvk}` : null, org.vatNumber ? `Btw ${org.vatNumber}` : null, org.city]
                    .filter(Boolean)
                    .join("  ·  ") || "Geen bedrijfsgegevens ingevuld"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrg(null);
                  setCreated(null);
                }}
                className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold text-[color:var(--text-muted)]"
                style={{ borderColor: "var(--border)" }}
              >
                Wijzig
              </button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek op bedrijfsnaam…"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
              <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-[color:var(--text-muted)]">
                    {orgs.length === 0 ? "Organisaties laden…" : "Geen match"}
                  </div>
                ) : (
                  <ul>
                    {filtered.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => void selectOrg(o.id)}
                          disabled={loadingOrg}
                          className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-[color:var(--bg)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <span className="font-semibold text-[color:var(--text)]">{o.name}</span>
                          <span className="text-xs text-[color:var(--text-muted)]">{o.city ?? ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Calculator-regel */}
        <div className="brand-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calculator className="size-4" style={{ color: "var(--navy)" }} strokeWidth={2.2} />
            <h3 className="text-sm font-bold text-[color:var(--navy)]">Prijs</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Seats</label>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} className="size-8 rounded-lg border bg-white font-bold" style={{ borderColor: "var(--border)" }}>−</button>
                <input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 rounded-lg border bg-white px-2 py-1.5 text-center text-sm font-bold"
                  style={{ borderColor: "var(--border)" }}
                />
                <button type="button" onClick={() => setSeats(seats + 1)} className="size-8 rounded-lg border bg-white font-bold" style={{ borderColor: "var(--border)" }}>+</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Periode</label>
              <div className="mt-1 inline-flex gap-1 rounded-lg border bg-white p-0.5 text-xs" style={{ borderColor: "var(--border)" }}>
                {(["monthly", "quarterly", "yearly"] as OffertePeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-md px-2.5 py-1.5 font-semibold transition-colors ${period === p ? "text-white" : "text-[color:var(--text-muted)]"}`}
                    style={period === p ? { background: "var(--navy)" } : undefined}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">
                Prijs per seat {isCustom ? "(maatwerk — verplicht)" : "(leeg = staffel)"}
              </label>
              <input
                value={unitOverrideEur}
                onChange={(e) => setUnitOverrideEur(e.target.value)}
                placeholder={isCustom ? "bv. 95.00" : centsToEur(autoUnitCents)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{ borderColor: maatwerkPriceMissing ? "var(--orange)" : "var(--border)" }}
              />
              <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                {isCustom
                  ? `${pricing.customQuoteFrom}+ seats: staffel geeft geen vaste prijs, vul zelf in.`
                  : `Staffelprijs: ${euroCents(autoUnitCents)} per seat / ${PERIOD_LABELS[period].toLowerCase()}.`}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Omschrijving hoofdregel</label>
              <input
                value={stdDescription}
                onChange={(e) => setStdDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>

          {/* Extra regels */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-[color:var(--text-muted)]">Extra regels (optioneel)</span>
              <button type="button" onClick={addExtraLine} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold text-[color:var(--navy)]" style={{ borderColor: "var(--border)" }}>
                <Plus className="size-3" strokeWidth={2.4} /> Regel
              </button>
            </div>
            {extraLines.map((l, i) => (
              <div key={i} className="mb-1.5 flex items-center gap-2">
                <input value={l.description} onChange={(e) => setExtra(i, { description: e.target.value })} placeholder="Omschrijving (bv. onboarding)" className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)" }} />
                <input value={l.qty} onChange={(e) => setExtra(i, { qty: e.target.value })} className="w-14 rounded-lg border bg-white px-2 py-1.5 text-center text-sm" style={{ borderColor: "var(--border)" }} />
                <input value={l.unitEur} onChange={(e) => setExtra(i, { unitEur: e.target.value })} placeholder="€ excl." className="w-20 rounded-lg border bg-white px-2 py-1.5 text-right text-sm" style={{ borderColor: "var(--border)" }} />
                <button type="button" onClick={() => removeExtra(i)} className="shrink-0 text-[color:var(--text-soft)] hover:text-red-600"><Trash2 className="size-4" strokeWidth={2.2} /></button>
              </div>
            ))}
            <p className="text-[10px] text-[color:var(--text-muted)]">Negatief bedrag = korting (bv. −50,00).</p>
          </div>
        </div>

        {/* Tekst + geldigheid */}
        <div className="brand-card space-y-3 p-4">
          <h3 className="text-sm font-bold text-[color:var(--navy)]">Tekst &amp; geldigheid</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Geldig tot</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Intro</label>
            <textarea value={introText} onChange={(e) => setIntroText(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Afsluiting</label>
            <textarea value={closingText} onChange={(e) => setClosingText(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </div>
          <p className="text-[10px] text-[color:var(--text-muted)]">
            Deze teksten zijn klant-facing. Houd ze kort en feitelijk (TOV).
          </p>
        </div>
      </div>

      {/* ───── Rechter kolom: totaal + actie ───── */}
      <aside className="space-y-4">
        <div className="brand-card p-4">
          <h3 className="mb-2 text-sm font-bold text-[color:var(--navy)]">Totaal</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-[color:var(--text-muted)]"><span>Subtotaal excl. btw</span><span>{euroCents(totals.netCents)}</span></div>
            <div className="flex justify-between text-[color:var(--text-muted)]"><span>Btw 21%</span><span>{euroCents(totals.vatCents)}</span></div>
            <div className="mt-1 flex justify-between border-t pt-1.5 font-bold text-[color:var(--navy)]" style={{ borderColor: "var(--border)" }}>
              <span>Totaal incl. btw</span><span className="text-base">{euroCents(totals.grossCents)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !org || maatwerkPriceMissing}
            className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "#FF8441" }}
          >
            {saving ? "Opslaan…" : "Opslaan bij klant"}
          </button>
          {!org ? <p className="mt-1.5 text-center text-[10px] text-[color:var(--text-muted)]">Kies eerst een organisatie.</p> : null}
        </div>

        {created ? (
          <div className="brand-card space-y-2 border-l-4 p-4" style={{ borderLeftColor: "var(--navy)" }}>
            <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--navy)]">
              <FileText className="size-4" strokeWidth={2.2} /> {created.quoteNumber}
            </div>
            <a href={`/api/admin/offertes/${created.id}/pdf`} target="_blank" rel="noreferrer" className="block w-full rounded-lg border px-3 py-2 text-center text-sm font-semibold text-[color:var(--navy)]" style={{ borderColor: "var(--border)" }}>
              Bekijk PDF
            </a>
            <a href={`/api/admin/offertes/${created.id}/pdf?download=1`} className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ background: "var(--navy)" }}>
              <Download className="size-4" strokeWidth={2.2} /> Download PDF
            </a>
            <p className="text-[10px] text-[color:var(--text-muted)]">
              Ook zichtbaar in de CRM-sidepanel van {org?.name}.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
