"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Admin = { id: string; name: string; email: string };

type Props = {
  admins: Admin[];
  currentUserId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function NewOrgModal({
  admins,
  currentUserId,
  onClose,
  onCreated,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    kvk: "",
    city: "",
    accountOwnerId: currentUserId,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    proposedSeats: "",
    proposedAmountCents: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!form.name.trim()) {
      setError("Bedrijfsnaam is verplicht");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/admin/crm/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        kvk: form.kvk || null,
        city: form.city || null,
        accountOwnerId: form.accountOwnerId,
        proposedSeats: form.proposedSeats ? Number(form.proposedSeats) : null,
        proposedAmountCents: form.proposedAmountCents
          ? Math.round(Number(form.proposedAmountCents) * 100)
          : null,
        notes: form.notes || null,
        source: "am_outreach",
      }),
    });

    const data = (await res.json()) as {
      success?: boolean;
      data?: { id: string };
      error?: string;
    };
    if (!data.success || !data.data) {
      setError(data.error ?? "Aanmaken mislukt");
      setSubmitting(false);
      return;
    }

    const orgId = data.data.id;

    // Contact direct toevoegen als ingevuld
    if (form.contactName && form.contactEmail) {
      await fetch(`/api/admin/crm/organizations/${orgId}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.contactName,
          email: form.contactEmail,
          phone: form.contactPhone || null,
          isPrimary: true,
        }),
      });
    }

    setSubmitting(false);
    onCreated(orgId);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[color:var(--navy)]">
              Nieuwe organisatie
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Vul minstens een bedrijfsnaam in. De rest kan je later
              aanvullen in de side-panel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-[color:var(--bg)]"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <Field
            label="Bedrijfsnaam *"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="KvK"
              value={form.kvk}
              onChange={(v) => setForm({ ...form, kvk: v })}
            />
            <Field
              label="Plaats"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
          </div>

          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 text-xs font-bold text-[color:var(--navy)]">
              Contactpersoon
            </div>
            <Field
              label="Naam"
              value={form.contactName}
              onChange={(v) => setForm({ ...form, contactName: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="E-mail"
                type="email"
                value={form.contactEmail}
                onChange={(v) => setForm({ ...form, contactEmail: v })}
              />
              <Field
                label="Telefoon"
                value={form.contactPhone}
                onChange={(v) => setForm({ ...form, contactPhone: v })}
              />
            </div>
          </div>

          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 text-xs font-bold text-[color:var(--navy)]">
              Deal-info
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Gewenste seats"
                type="number"
                value={form.proposedSeats}
                onChange={(v) => setForm({ ...form, proposedSeats: v })}
              />
              <Field
                label="Voorgesteld bedrag (€)"
                type="number"
                value={form.proposedAmountCents}
                onChange={(v) => setForm({ ...form, proposedAmountCents: v })}
              />
            </div>
            <label className="mt-2 block">
              <span className="text-xs font-semibold text-[color:var(--text)]">
                Owner
              </span>
              <select
                value={form.accountOwnerId}
                onChange={(e) =>
                  setForm({ ...form, accountOwnerId: e.target.value })
                }
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-[color:var(--text)]">
              Notitie
            </span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="Hoe heb je ze gevonden? Wat is de context?"
            />
          </label>
        </div>

        {error && (
          <div
            className="mt-3 rounded-lg border p-2 text-xs"
            style={{
              background: "#FEE2E2",
              borderColor: "#FCA5A5",
              color: "#991B1B",
            }}
          >
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--orange)" }}
          >
            {submitting ? "Bezig..." : "Aanmaken"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[color:var(--text)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}
