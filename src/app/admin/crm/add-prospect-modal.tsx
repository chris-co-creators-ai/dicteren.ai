"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

type AdminUser = { id: string; name: string };
type LeadOption = { id: string; name: string; color: string };

type Props = {
  adminUsers: AdminUser[];
  lists: LeadOption[];
  onClose: () => void;
  onDone: () => void;
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
import { MKB_BRANCHES } from "@/lib/services/mkbBranches";

export function AddProspectModal({
  adminUsers,
  lists,
  onClose,
  onDone,
}: Props) {
  const [tab, setTab] = useState<"manual" | "csv">("manual");

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
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-xl font-bold">Prospect toevoegen</h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Een prospect = een rij in de CRM-tabel zonder login. Bij signup met
          dezelfde email wordt het automatisch een ingelogde klant.
        </p>

        <div className="mt-4 flex gap-1 border-b border-[color:var(--border-soft)]">
          <TabButton
            active={tab === "manual"}
            onClick={() => setTab("manual")}
            label="Handmatig"
          />
          <TabButton
            active={tab === "csv"}
            onClick={() => setTab("csv")}
            label="CSV import"
          />
        </div>

        {tab === "manual" ? (
          <ManualForm
            adminUsers={adminUsers}
            lists={lists}
            onDone={onDone}
            onCancel={onClose}
          />
        ) : (
          <CsvForm
            adminUsers={adminUsers}
            lists={lists}
            onDone={onDone}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "border-b-2 border-[color:var(--orange)] px-3 py-2 text-sm font-bold"
          : "px-3 py-2 text-sm font-medium text-[color:var(--text-muted)]"
      }
    >
      {label}
    </button>
  );
}

function ManualForm({
  adminUsers,
  lists,
  onDone,
  onCancel,
}: {
  adminUsers: AdminUser[];
  lists: LeadOption[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<string>("prospect");
  const [temperature, setTemperature] = useState<string>("cold");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [listIds, setListIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/prospects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prospect: {
          email,
          name: name || null,
          company: company || null,
          phone: phone || null,
          notes: notes || null,
          stage,
          temperature,
          assignedToUserId: assignedToUserId || null,
          source: "manual",
        },
        listIds,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Toevoegen mislukt.");
      setSubmitting(false);
      return;
    }
    // Stad/branche zijn enrichment-velden: apart wegschrijven (zelfde route
    // als de inline-edit in de grid). Best-effort — blokkeert het aanmaken niet.
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
    onDone();
  }

  function toggleList(id: string) {
    setListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Email" required>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Naam">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Bedrijf">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Telefoon">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Stad">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Branche">
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="input"
        >
          <option value="">— Kies een branche</option>
          {MKB_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stage">
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
      </Field>
      <Field label="Temperatuur">
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
      </Field>
      <Field label="Account-manager">
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
      </Field>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-xs font-semibold">Notitie</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input min-h-[60px]"
        />
      </label>

      {lists.length > 0 && (
        <div className="grid gap-1 sm:col-span-2">
          <span className="text-xs font-semibold">Voeg toe aan lijsten</span>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => (
              <label
                key={l.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] px-2 py-1 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={listIds.includes(l.id)}
                  onChange={() => toggleList(l.id)}
                />
                <span
                  className="size-2 rounded-full"
                  style={{ background: listColorHex(l.color) }}
                />
                {l.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Annuleer
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting ? "Toevoegen…" : "Prospect toevoegen"}
        </button>
      </div>
    </form>
  );
}

function CsvForm({
  adminUsers,
  lists,
  onDone,
  onCancel,
}: {
  adminUsers: AdminUser[];
  lists: LeadOption[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [stage, setStage] = useState<string>("prospect");
  const [temperature, setTemperature] = useState<string>("cold");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [listIds, setListIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    total: number;
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
      // Auto-map standaard kolomnamen.
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

  const emailColIdx = useMemo(
    () => mapping.indexOf("email"),
    [mapping],
  );

  async function submit() {
    setError(null);
    if (emailColIdx === -1) {
      setError("Wijs een kolom toe als 'Email *'.");
      return;
    }
    setSubmitting(true);
    const prospects = rows
      .map((row) => {
        const data: Record<string, string> = {};
        mapping.forEach((field, idx) => {
          if (field === "skip") return;
          const val = (row[idx] ?? "").trim();
          if (val) data[field] = val;
        });
        if (!data.email) return null;
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
      body: JSON.stringify({ prospects, listIds }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Import mislukt.");
      setSubmitting(false);
      return;
    }
    setResult(data.result);
    setSubmitting(false);
  }

  function toggleList(id: string) {
    setListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  if (result) {
    return (
      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="text-xs font-semibold uppercase text-green-800">
          Import voltooid
        </div>
        <div className="mt-2 text-2xl font-bold text-green-900">
          {result.created} nieuw · {result.updated} bestaande bijgewerkt ·{" "}
          {result.skipped} overgeslagen
        </div>
        <p className="mt-2 text-xs text-green-800">
          Totaal verwerkt: {result.total} rijen.
        </p>
        <div className="mt-4 flex justify-end">
          <button onClick={onDone} className="btn btn-primary">
            Klaar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      {rows.length === 0 ? (
        <>
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
              ondersteund: komma- of puntkomma-gescheiden, quoted strings
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />
        </>
      ) : (
        <>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
              Kolom-mapping
            </div>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Wijs elke CSV-kolom toe aan een prospect-veld. Email is verplicht.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--border-soft)]">
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
                    <tr
                      key={idx}
                      className="border-t border-[color:var(--border-soft)]"
                    >
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

          <div className="grid gap-4 sm:grid-cols-3">
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

          {lists.length > 0 && (
            <div className="grid gap-1">
              <span className="text-xs font-semibold">
                Voeg toe aan lijsten
              </span>
              <div className="flex flex-wrap gap-2">
                {lists.map((l) => (
                  <label
                    key={l.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] px-2 py-1 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={listIds.includes(l.id)}
                      onChange={() => toggleList(l.id)}
                    />
                    <span
                      className="size-2 rounded-full"
                      style={{ background: listColorHex(l.color) }}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="btn btn-secondary">
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
                : `Importeer ${rows.length} prospects`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold">
        {label}{" "}
        {required && <span className="text-[color:var(--orange)]">*</span>}
      </span>
      {children}
    </label>
  );
}

function listColorHex(color: string): string {
  const map: Record<string, string> = {
    blue: "#3B82F6",
    green: "#22C55E",
    orange: "#F97316",
    red: "#EF4444",
    purple: "#A855F7",
    gray: "#6B7280",
    navy: "#1E3A8A",
    aqua: "#06B6D4",
  };
  return map[color] ?? "#3B82F6";
}
