"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

type AdminUser = { id: string; name: string };

type Props = {
  adminUsers: AdminUser[];
  onClose: () => void;
  onDone: (createdListId: string | null) => void;
};

const FIELD_OPTIONS = [
  { key: "skip", label: "— Skip —" },
  { key: "email", label: "Email *" },
  { key: "name", label: "Naam" },
  { key: "company", label: "Bedrijf" },
  { key: "phone", label: "Telefoon" },
  { key: "notes", label: "Notitie" },
] as const;

type FieldKey = (typeof FIELD_OPTIONS)[number]["key"];

import { parseCsv } from "@/lib/csv";

const COLOR_OPTIONS = [
  "blue",
  "green",
  "orange",
  "red",
  "purple",
  "gray",
  "navy",
  "aqua",
];
const COLOR_BG: Record<string, string> = {
  blue: "#3B82F6",
  green: "#22C55E",
  orange: "#F97316",
  red: "#EF4444",
  purple: "#A855F7",
  gray: "#6B7280",
  navy: "#1E3A8A",
  aqua: "#06B6D4",
};

export function CsvImportModal({ adminUsers, onClose, onDone }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [stage, setStage] = useState("prospect");
  const [temperature, setTemperature] = useState("cold");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [listName, setListName] = useState(
    `CSV import ${new Date().toLocaleDateString("nl-NL")}`,
  );
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [listColor, setListColor] = useState("blue");
  const [createList, setCreateList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    total: number;
    listId: string | null;
    listName: string | null;
  } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setError("CSV leeg.");
      return;
    }
    setError(null);
    if (hasHeader) {
      setHeaders(parsed[0]);
      setRows(parsed.slice(1));
      const auto: FieldKey[] = parsed[0].map((h) => {
        const lower = h.trim().toLowerCase();
        if (/^(e-?mail|mail)$/.test(lower)) return "email";
        if (/^(naam|name|naam.*)/.test(lower)) return "name";
        if (/^(bedrijf|company|organisatie)/.test(lower)) return "company";
        if (/^(telefoon|phone|tel)/.test(lower)) return "phone";
        if (/^(notitie|notes|opmerking)/.test(lower)) return "notes";
        return "skip";
      });
      setMapping(auto);
    } else {
      setHeaders(parsed[0].map((_, i) => `Kolom ${i + 1}`));
      setRows(parsed);
      setMapping(parsed[0].map(() => "skip"));
    }
  }

  const preview = rows.slice(0, 5);
  const emailColIdx = useMemo(() => mapping.indexOf("email"), [mapping]);

  async function submit() {
    setError(null);
    if (emailColIdx === -1) {
      setError("Wijs een kolom toe als 'Email *'.");
      return;
    }
    setSubmitting(true);

    let createdListId: string | null = null;
    if (createList && listName.trim()) {
      try {
        const listRes = await fetch("/api/admin/lead-lists", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: listName.trim(),
            description: `Auto-created bij CSV-import van ${rows.length} prospects op ${new Date().toLocaleString("nl-NL")}`,
            color: listColor,
            isShared: true,
          }),
        });
        const listData = await listRes.json();
        if (listData.success) {
          createdListId = listData.list.id;
        }
      } catch {
        // lijst-creatie faalt, ga door met prospects zonder lijst
      }
    }

    // Eerst dedup-check per rij. Sla exact-match rijen over.
    const skipEmails = new Set<string>();
    if (skipDuplicates) {
      const candidates = rows
        .map((row) => {
          const idx = emailColIdx;
          const val = idx >= 0 ? (row[idx] ?? "").trim() : "";
          return val ? val.toLowerCase() : null;
        })
        .filter((v): v is string => !!v);

      const checks = await Promise.all(
        candidates.map(async (email) => {
          try {
            const r = await fetch(
              `/api/admin/contacts/search?email=${encodeURIComponent(email)}`,
            );
            if (!r.ok) return null;
            const data = await r.json();
            return data?.data?.hasExactMatch ? email : null;
          } catch {
            return null;
          }
        }),
      );
      for (const e of checks) if (e) skipEmails.add(e);
    }

    const prospects = rows
      .map((row) => {
        const data: Record<string, string> = {};
        mapping.forEach((field, idx) => {
          if (field === "skip") return;
          const val = (row[idx] ?? "").trim();
          if (val) data[field] = val;
        });
        if (!data.email) return null;
        if (skipEmails.has(data.email.toLowerCase())) return null;
        return {
          email: data.email,
          name: data.name ?? null,
          company: data.company ?? null,
          phone: data.phone ?? null,
          notes: data.notes ?? null,
          stage,
          temperature,
          assignedToUserId: assignedToUserId || null,
          source: "csv-import",
        };
      })
      .filter((p) => p !== null);

    if (prospects.length === 0) {
      setError("Geen rijen met geldige email.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/admin/prospects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prospects,
        listIds: createdListId ? [createdListId] : [],
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Import mislukt.");
      setSubmitting(false);
      return;
    }
    setResult({
      ...data.result,
      listId: createdListId,
      listName: createdListId ? listName.trim() : null,
    });
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-[color:var(--bg)]"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-xl font-bold">CSV-import</h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Importeer prospects vanuit een CSV-bestand. Optioneel maakt het
          systeem direct een nieuwe lijst aan en voegt alle prospects daar
          aan toe.
        </p>

        {result ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-semibold uppercase text-green-800">
              Import voltooid
            </div>
            <div className="mt-2 text-lg font-bold text-green-900">
              {result.created} nieuw · {result.updated} bijgewerkt ·{" "}
              {result.skipped} overgeslagen
            </div>
            {result.listName && (
              <p className="mt-2 text-sm text-green-800">
                Lijst aangemaakt: <strong>{result.listName}</strong>
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => onDone(result.listId)}
                className="btn btn-primary"
              >
                Klaar
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-5 grid gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              Eerste rij is een headerregel
            </label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--border-soft)] p-10 text-sm text-[color:var(--text-muted)] hover:border-[color:var(--orange)]"
            >
              <Upload className="size-6" strokeWidth={2.2} />
              <span className="mt-2 font-semibold">Kies CSV-bestand</span>
              <span className="mt-1 text-[0.6875rem]">
                komma- of puntkomma-gescheiden, quoted strings ondersteund
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="hidden"
            />
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 max-h-[60vh] overflow-y-auto">
            <div>
              <div className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                Kolom-mapping
              </div>
              <div className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border-soft)]">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--bg)]">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left">
                          <div className="font-semibold text-[color:var(--navy)]">
                            {h}
                          </div>
                          <select
                            value={mapping[i] ?? "skip"}
                            onChange={(e) => {
                              const next = [...mapping];
                              next[i] = e.target.value as FieldKey;
                              setMapping(next);
                            }}
                            className="mt-1 rounded border border-[color:var(--border-soft)] bg-white px-2 py-0.5 text-[0.6875rem]"
                          >
                            {FIELD_OPTIONS.map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, idx) => (
                      <tr key={idx} className="border-t border-[color:var(--border-soft)]">
                        {headers.map((_, i) => (
                          <td
                            key={i}
                            className="max-w-[200px] truncate px-3 py-2 text-[color:var(--text-muted)]"
                          >
                            {r[i] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[0.6875rem] text-[color:var(--text-soft)]">
                Preview eerste 5 van {rows.length} rijen
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--border-soft)] p-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={createList}
                  onChange={(e) => setCreateList(e.target.checked)}
                />
                Maak automatisch een nieuwe lijst aan
              </label>
              {createList && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold">Lijst-naam</span>
                    <input
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      className="input"
                      placeholder="bv. CSV import Q3 2026"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold">Kleur</span>
                    <div className="flex gap-1.5">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setListColor(c)}
                          className={`size-6 rounded-full border-2 ${
                            listColor === c
                              ? "border-[color:var(--navy)]"
                              : "border-transparent"
                          }`}
                          style={{ background: COLOR_BG[c] }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Stage</span>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="input"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="mql">MQL</option>
                  <option value="sql">SQL</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Temperatuur</span>
                <select
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="input"
                >
                  <option value="cold">Koud</option>
                  <option value="lukewarm">Lauw</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Heet</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Account-manager</span>
                <select
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  className="input"
                >
                  <option value="">— Niemand</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div
              className="rounded-lg border bg-white p-3 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Sla rijen over die al ergens in onze database staan (cross-table dedup)
              </label>
              <p className="mt-1 pl-6 text-[color:var(--text-muted)]">
                Aanbevolen. Anders krijg je dezelfde klant twee keer in onze CRM, partner-lijst of affiliate-tabel.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn btn-secondary">
                Annuleer
              </button>
              <button
                onClick={submit}
                disabled={submitting || emailColIdx === -1}
                className="btn btn-primary disabled:opacity-50"
                type="button"
              >
                {submitting
                  ? "Importeren…"
                  : `Importeer ${rows.length} prospects${skipDuplicates ? " (skip duplicates)" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
