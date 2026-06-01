"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Lock, Unlock, AlertTriangle } from "lucide-react";
import type { PricingSnapshot } from "@/lib/services/pricingTiers";

type Row = { minSeats: number; maxSeats: number | null; priceEur: number };

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function PricingEditor({
  initial,
  isAdmin,
}: {
  initial: PricingSnapshot;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [locked, setLocked] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  const disabled = locked || !isAdmin;

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

  async function doSave() {
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
      setLocked(true);
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Verbinding mislukt." });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--border)" }}>
      {/* Header met lock-status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[color:var(--navy)]">
            {locked ? (
              <Lock className="size-4 text-[color:var(--text-muted)]" />
            ) : (
              <Unlock className="size-4 text-[color:var(--orange)]" />
            )}
            Zakelijke prijzen & staffels
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--text-muted)]">
            Jaarprijs per seat per staffel; kwartaal en maand worden hieruit afgeleid.
            Wijzigingen passen <strong>direct de prijzen op de website</strong> en alle
            checkout-routes aan.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setLocked((l) => !l);
              setMsg(null);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            {locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            {locked ? "Ontgrendelen" : "Vergrendelen"}
          </button>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--bg)] px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)]">
            <Lock className="size-3.5" /> Alleen admin kan wijzigen
          </span>
        )}
      </div>

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
                      disabled={disabled}
                      onChange={(e) => setRow(i, { minSeats: Number(e.target.value) || 1 })}
                      className="w-16 rounded-md border px-2 py-1 text-center disabled:bg-[color:var(--bg)] disabled:text-[color:var(--text-muted)]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={r.minSeats}
                      value={r.maxSeats ?? ""}
                      placeholder="∞"
                      disabled={disabled}
                      onChange={(e) =>
                        setRow(i, {
                          maxSeats: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="w-16 rounded-md border px-2 py-1 text-center disabled:bg-[color:var(--bg)] disabled:text-[color:var(--text-muted)]"
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
                        disabled={disabled}
                        onChange={(e) => setRow(i, { priceEur: Number(e.target.value) || 0 })}
                        className="w-24 rounded-md border px-2 py-1 text-right font-semibold disabled:bg-[color:var(--bg)] disabled:text-[color:var(--text-muted)]"
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
                      disabled={disabled || rows.length <= 1}
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
        disabled={disabled}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--navy)] hover:underline disabled:opacity-40 disabled:no-underline"
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
            disabled={disabled}
            onChange={(e) => setQuarterlyPct(Number(e.target.value) || 0)}
            className="rounded-md border px-2 py-1.5 disabled:bg-[color:var(--bg)] disabled:text-[color:var(--text-muted)]"
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
            disabled={disabled}
            onChange={(e) => setMonthlyPct(Number(e.target.value) || 0)}
            className="rounded-md border px-2 py-1.5 disabled:bg-[color:var(--bg)] disabled:text-[color:var(--text-muted)]"
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
            disabled={disabled}
            onChange={(e) => setCustomFrom(Number(e.target.value) || 50)}
            className="rounded-md border px-2 py-1.5 disabled:bg-[color:var(--bg)] disabled:text-[color:var(--text-muted)]"
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
        onClick={() => setConfirmOpen(true)}
        disabled={disabled || saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        style={{ background: "#042660" }}
      >
        <Save className="size-4" strokeWidth={2.2} />
        Prijzen opslaan
      </button>

      {/* Bevestigingsmodal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !saving && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[color:var(--orange)]" />
              <h3 className="text-lg font-bold text-[color:var(--navy)]">Weet je het zeker?!</h3>
            </div>
            <p className="mt-3 text-sm text-[color:var(--text)]">
              Dit past <strong>direct de prijzen op de website</strong> (/prijzen),
              de zakelijke checkout én de CRM-payment-links aan. Klanten zien en
              betalen meteen de nieuwe bedragen.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: "var(--border)" }}
              >
                Nee, annuleren
              </button>
              <button
                type="button"
                onClick={doSave}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#FF8441" }}
              >
                {saving ? "Opslaan…" : "Ja, prijzen aanpassen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
