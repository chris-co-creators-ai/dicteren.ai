"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

type AdminUser = { id: string; name: string };

type Props = {
  adminUsers: AdminUser[];
  activeListId: string | "all";
  onCancel: () => void;
  onSaved: () => void;
  colSpan: number;
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

export function InlineProspectRow({
  adminUsers,
  activeListId,
  onCancel,
  onSaved,
  colSpan,
}: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("prospect");
  const [temperature, setTemperature] = useState("cold");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <tr
      className="bg-orange-50/40"
      style={{ borderTop: "2px solid var(--orange)" }}
      onKeyDown={onKeyDown}
    >
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2" colSpan={colSpan}>
        <div className="grid gap-2 sm:grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_1.5fr_auto]">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email *"
            className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
            autoFocus
            required
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="naam"
            className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="bedrijf"
            className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="tel"
            className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="rounded border border-[color:var(--border-soft)] bg-white px-1 py-1 text-xs"
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="rounded border border-[color:var(--border-soft)] bg-white px-1 py-1 text-xs"
          >
            {TEMP_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TEMP_LABEL[t]}
              </option>
            ))}
          </select>
          <select
            value={assignedToUserId}
            onChange={(e) => setAssignedToUserId(e.target.value)}
            className="rounded border border-[color:var(--border-soft)] bg-white px-1 py-1 text-xs"
          >
            <option value="">— manager</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={submit}
              disabled={submitting}
              className="grid size-7 place-items-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              title="Opslaan (Enter)"
            >
              <Check className="size-3.5" strokeWidth={2.4} />
            </button>
            <button
              onClick={onCancel}
              className="grid size-7 place-items-center rounded-full bg-gray-200 hover:bg-gray-300"
              title="Annuleer (Esc)"
            >
              <X className="size-3.5" strokeWidth={2.4} />
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-1 text-[0.6875rem] text-red-700">{error}</div>
        )}
      </td>
    </tr>
  );
}
