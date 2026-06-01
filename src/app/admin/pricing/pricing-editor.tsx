"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import type { PricingSnapshot } from "@/lib/services/pricingTiers";

type Row = { minSeats: number; maxSeats: number | null; priceEur: number };

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function PricingEditor({ initial }: { initial: PricingSnapshot }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initial.tiers.map((t) => ({
      minSeats: t.min,
      maxSeats: t.max,
      priceEur: t.pricePerSeatCents / 100,
    })),
  );
  const [quarterlyPct, setQuarterlyPct] = useState(initial.quarterlyPremiumPct);
  const [monthlyPct, setMonthlyPct] = useState(initial.monthlyPremiumPct);
  const [customFrom, setCustomFrom] = useState(initial.customQuoteFrom);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const last = rows[rows.length - 1];
    const nextMin = last?.maxSeats ? last.maxSeats + 1 : (last?.minSeats ?? 0) + 1;
    setRows((rs) => [...rs, { minSeats: nextMin, maxSeats: nextMin + 4, priceEur: 0 }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  function previewCents(yearlyCents: number, period: "q" | "m"): number {
    return period === "q"
      ? Math.round((yearlyCents / 4) * (1 + quarterlyPct / 100))
      : Math.round((yearlyCents / 12) * (1 + monthlyPct / 100));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiers: rows.map((r) => ({
            minSeats: r.minSeats,
            maxSeats: r.maxSeats,
            pricePerSeatCents: Math.round(r.priceEur * 100),
          })),
          quarterlyPremiumPct: quarterlyPct,
          monthlyPremiumPct: monthlyPct,
          customQuoteFrom: customFrom,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMsg({ ok: false, text: data.error ?? "Opslaan mislukt." });
        return;
      }
      setMsg({ ok: true, text: "Prijzen opgeslagen. Live binnen 1 minuut." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Verbinding mislukt." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border bg-white p-6" style={{ borderColor: "var(--border)" }}>
      <h2 className="text-lg font-bold text-[color:var(--navy)]">Zakelijke prijzen & staffels</h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        Jaarprijs per seat per staffel. Kwartaal en maand worden hieruit afgeleid met de premie.
        Wijzigingen gelden direct voor alle checkout-routes (self-service, CRM-payment-link, /prijzen).
      </p>

      {/* Staffel-tabel */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[0.6875rem] uppercase tracking-wide text-[color:var(--text-muted)]">
              <th className="py-2 pr-3">Van</th>
              <th className="py-2 pr-3">T/m</th>
              <th className="py-2 pr-3">€/seat/jaar</th>
              <th className="py-2 pr-3">→ kwartaal</th>
              <th className="py-2 pr-3">→ maand</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const yearlyCents = Math.round(r.priceEur * 100);
              return (
                <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={1}
                      value={r.minSeats}
                      onChange={(e) => setRow(i, { minSeats: Number(e.target.value) || 1 })}
                      className="w-16 rounded-md border px-2 py-1 text-center"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={r.minSeats}
                      value={r.maxSeats ?? ""}
                      placeholder="∞"
                      onChange={(e) =>
                        setRow(i, {
                          maxSeats: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="w-16 rounded-md border px-2 py-1 text-center"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[color:var(--text-muted)]">€</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={r.priceEur}
                        onChange={(e) => setRow(i, { priceEur: Number(e.target.value) || 0 })}
                        className="w-24 rounded-md border px-2 py-1 text-right font-semibold"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-[color:var(--text-muted)]">
                    {eur(previewCents(yearlyCents, "q"))}
                  </td>
                  <td className="py-2 pr-3 text-[color:var(--text-muted)]">
                    {eur(previewCents(yearlyCents, "m"))}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                      className="text-[color:var(--text-muted)] hover:text-red-600 disabled:opacity-30"
                      aria-label="Staffel verwijderen"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--navy)] hover:underline"
      >
        <Plus className="size-3.5" /> Staffel toevoegen
      </button>

      {/* Premies + drempel */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[color:var(--text)]">Kwartaal-premie (%)</span>
          <input
            type="number"
            min={0}
            max={500}
            value={quarterlyPct}
            onChange={(e) => setQuarterlyPct(Number(e.target.value) || 0)}
            className="rounded-md border px-2 py-1.5"
            style={{ borderColor: "var(--border)" }}
          />
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">bovenop jaar/4</span>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[color:var(--text)]">Maand-premie (%)</span>
          <input
            type="number"
            min={0}
            max={500}
            value={monthlyPct}
            onChange={(e) => setMonthlyPct(Number(e.target.value) || 0)}
            className="rounded-md border px-2 py-1.5"
            style={{ borderColor: "var(--border)" }}
          />
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">bovenop jaar/12</span>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[color:var(--text)]">Maatwerk vanaf (seats)</span>
          <input
            type="number"
            min={1}
            value={customFrom}
            onChange={(e) => setCustomFrom(Number(e.target.value) || 50)}
            className="rounded-md border px-2 py-1.5"
            style={{ borderColor: "var(--border)" }}
          />
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">offerte i.p.v. checkout</span>
        </label>
      </div>

      {msg && (
        <div
          className="mt-4 rounded-md px-3 py-2 text-sm"
          style={{
            background: msg.ok ? "color-mix(in srgb, var(--green) 10%, white)" : "#fef2f2",
            color: msg.ok ? "var(--green)" : "#b91c1c",
          }}
        >
          {msg.text}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "#042660" }}
      >
        <Save className="size-4" strokeWidth={2.2} />
        {saving ? "Opslaan…" : "Prijzen opslaan"}
      </button>
    </section>
  );
}
