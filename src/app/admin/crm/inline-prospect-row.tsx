"use client";

// Dicteren.ai — Inline prospect-rij in de Personen-grid.
//
// Rendert per zichtbare kolom een invoercel op exact dezelfde positie als de
// gewone rijen (zelfde td-structuur: checkbox + kolommen + filler + sticky
// actie-cel), zodat de AM een lead invult "in" de tabel zelf. Kolommen zonder
// invoerveld (acties, klant-economie) tonen een streepje. Stad en branche
// worden na het aanmaken via de enrichment-route weggeschreven (zelfde pad als
// inline-edit in de grid).

import { useState } from "react";
import { Check, X } from "lucide-react";
import { MKB_BRANCHES } from "@/lib/services/mkbBranches";

type AdminUser = { id: string; name: string };

type Props = {
  adminUsers: AdminUser[];
  activeListId: string | "all";
  /** Zichtbare kolommen in volgorde — bepaalt welke cel welk veld krijgt. */
  columns: string[];
  onCancel: () => void;
  onSaved: () => void;
};

const STAGE_OPTIONS = ["lead", "prospect", "mql", "sql"];
const TEMP_OPTIONS = ["cold", "lukewarm", "warm", "hot"];

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  mql: "MQL",
  sql: "SQL",
};
const TEMP_LABEL: Record<string, string> = {
  cold: "Koud",
  lukewarm: "Lauw",
  warm: "Warm",
  hot: "Heet",
};

const INPUT_CLS =
  "w-full rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs outline-none focus:border-[color:var(--orange)]";

export function InlineProspectRow({
  adminUsers,
  activeListId,
  columns,
  onCancel,
  onSaved,
}: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("prospect");
  const [temperature, setTemperature] = useState("cold");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Velden die geen zichtbare kolom hebben, blijven invulbaar nodig? Nee:
  // e-mail is het enige verplichte veld. Staat de e-mailkolom uit, dan tonen
  // we het e-mailveld in de Klant-cel als fallback.
  const hasEmailColumn = columns.includes("email");

  async function submit() {
    if (submitting) return; // guard tegen dubbele Enter / klik
    if (!email.trim()) {
      setError("Email verplicht");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prospect: {
            email,
            name: name || null,
            company: company || null,
            phone: phone || null,
            stage,
            temperature,
            assignedToUserId: assignedToUserId || null,
            source: "manual-inline",
          },
          listIds: activeListId !== "all" ? [activeListId] : [],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Toevoegen mislukt");
        setSubmitting(false);
        return;
      }
      // Stad/branche zijn enrichment-velden: apart wegschrijven (zelfde route
      // als de inline-edit op bestaande rijen). Best-effort: de prospect
      // bestaat al, een enrichment-fout mag het toevoegen niet blokkeren.
      const contactId: string | undefined = data.data?.contactId;
      if (contactId && (city.trim() || industry)) {
        await fetch(`/api/admin/crm/contacts/${contactId}/enrichment`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(city.trim() ? { city: city.trim() } : {}),
            ...(industry ? { industry } : {}),
          }),
        }).catch(() => undefined);
      }
      onSaved();
    } catch {
      setError("Netwerkprobleem");
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") onCancel();
  }

  function cellFor(col: string): React.ReactNode {
    switch (col) {
      case "customer":
        return (
          <div className="flex flex-col gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naam"
              className={INPUT_CLS}
              autoFocus
            />
            {!hasEmailColumn && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail *"
                className={INPUT_CLS}
                required
              />
            )}
          </div>
        );
      case "email":
        return (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail *"
            className={INPUT_CLS}
            required
          />
        );
      case "phone":
        return (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefoon"
            className={INPUT_CLS}
          />
        );
      case "city":
        return (
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Stad"
            className={INPUT_CLS}
          />
        );
      case "companyName":
        return (
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Bedrijf"
            className={INPUT_CLS}
          />
        );
      case "industry":
        return (
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={INPUT_CLS}
          >
            <option value="">Branche…</option>
            {MKB_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        );
      case "stage":
        return (
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className={INPUT_CLS}
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        );
      case "temperature":
        return (
          <select
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className={INPUT_CLS}
          >
            {TEMP_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TEMP_LABEL[t]}
              </option>
            ))}
          </select>
        );
      case "assignee":
        return (
          <select
            value={assignedToUserId}
            onChange={(e) => setAssignedToUserId(e.target.value)}
            className={INPUT_CLS}
          >
            <option value="">— Manager</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        );
      default:
        return <span className="text-[color:var(--text-soft)]">—</span>;
    }
  }

  return (
    <tr
      className="bg-orange-50/40"
      style={{ borderTop: "2px solid var(--orange)" }}
      onKeyDown={onKeyDown}
    >
      {/* Checkbox-kolom */}
      <td className="px-2 py-1.5" />
      {columns.map((col) => (
        <td
          key={col}
          className="px-2 py-1.5 align-middle"
          title={error && (col === "email" || col === "customer") ? error : undefined}
        >
          {cellFor(col)}
        </td>
      ))}
      {/* Filler (zelfde structuur als gewone rijen) */}
      <td className="px-0 py-1.5" />
      {/* Sticky actie-cel: opslaan / annuleren */}
      <td className="sticky right-0 z-10 bg-orange-50 px-1 py-1.5 text-center align-middle">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={submit}
            disabled={submitting}
            className="grid size-6 place-items-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            title={error ?? "Opslaan (Enter)"}
          >
            <Check className="size-3.5" strokeWidth={2.4} />
          </button>
          <button
            onClick={onCancel}
            className="grid size-6 place-items-center rounded-full bg-gray-200 hover:bg-gray-300"
            title="Annuleer (Esc)"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>
      </td>
    </tr>
  );
}
