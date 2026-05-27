"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MiniPricingCalculator } from "./mini-pricing-calculator";
import {
  DedupAlert,
  searchContactMatches,
  type ContactMatch,
} from "@/components/admin/DedupAlert";

type Admin = { id: string; name: string; email: string };

type Props = {
  admins: Admin[];
  currentUserId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function NewOrgPanel({
  admins,
  currentUserId,
  onClose,
  onCreated,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dedupMatches, setDedupMatches] = useState<ContactMatch[]>([]);
  const [hasExactMatch, setHasExactMatch] = useState(false);
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
    proposedPlanSlug: "",
    discountCode: "",
    notes: "",
  });

  // Debounced dedup-check zodra naam/kvk/email een drempel halen
  useEffect(() => {
    const handle = setTimeout(async () => {
      const args = {
        name: form.name.length >= 3 ? form.name : null,
        kvk: form.kvk.length >= 4 ? form.kvk : null,
        email: form.contactEmail.includes("@") ? form.contactEmail : null,
      };
      if (!args.name && !args.kvk && !args.email) {
        setDedupMatches([]);
        setHasExactMatch(false);
        return;
      }
      const result = await searchContactMatches(args);
      setDedupMatches(result.matches);
      setHasExactMatch(result.hasExactMatch);
    }, 400);
    return () => clearTimeout(handle);
  }, [form.name, form.kvk, form.contactEmail]);

  function handleInject(data: {
    seats: number;
    amountCents: number;
    planSlug: string;
    discountCode: string | null;
  }) {
    setForm((f) => ({
      ...f,
      proposedSeats: String(data.seats),
      proposedAmountCents: String((data.amountCents / 100).toFixed(2)),
      proposedPlanSlug: data.planSlug,
      discountCode: data.discountCode ?? "",
    }));
  }

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
        proposedSeats: form.proposedSeats
          ? Number(form.proposedSeats)
          : null,
        proposedAmountCents: form.proposedAmountCents
          ? Math.round(Number(form.proposedAmountCents) * 100)
          : null,
        proposedPlanSlug: form.proposedPlanSlug || null,
        discountCode: form.discountCode || null,
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
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="ml-auto h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl"
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 border-b bg-white px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[color:var(--navy)]">
                Nieuwe organisatie
              </h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Vul de bedrijfsgegevens links in. Gebruik rechts de calculator
                om de deal door te rekenen en injecteer hem in het formulier.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-[color:var(--bg)]"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Body — twee kolommen op grote schermen, stack op smaller */}
        <form
          onSubmit={handleSubmit}
          className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]"
        >
          {/* Linkerkolom: form */}
          <div className="space-y-4">
            {dedupMatches.length > 0 && (
              <DedupAlert
                matches={dedupMatches}
                hasExactMatch={hasExactMatch}
              />
            )}

            <Section title="Bedrijf">
              <TextField
                label="Bedrijfsnaam *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="KvK"
                  value={form.kvk}
                  onChange={(v) => setForm({ ...form, kvk: v })}
                />
                <TextField
                  label="Plaats"
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                />
              </div>
            </Section>

            <Section title="Contactpersoon">
              <TextField
                label="Naam"
                value={form.contactName}
                onChange={(v) => setForm({ ...form, contactName: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="E-mail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(v) => setForm({ ...form, contactEmail: v })}
                />
                <TextField
                  label="Telefoon"
                  value={form.contactPhone}
                  onChange={(v) => setForm({ ...form, contactPhone: v })}
                />
              </div>
            </Section>

            <Section title="Deal-info">
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="Seats"
                  type="number"
                  value={form.proposedSeats}
                  onChange={(v) => setForm({ ...form, proposedSeats: v })}
                />
                <TextField
                  label="Bedrag (€)"
                  type="number"
                  value={form.proposedAmountCents}
                  onChange={(v) =>
                    setForm({ ...form, proposedAmountCents: v })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="Plan-slug"
                  value={form.proposedPlanSlug}
                  onChange={(v) =>
                    setForm({ ...form, proposedPlanSlug: v })
                  }
                />
                <TextField
                  label="Kortingscode"
                  value={form.discountCode}
                  onChange={(v) => setForm({ ...form, discountCode: v })}
                />
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-[color:var(--text)]">
                  Owner
                </span>
                <select
                  value={form.accountOwnerId}
                  onChange={(e) =>
                    setForm({ ...form, accountOwnerId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </label>
            </Section>

            <Section title="Notitie">
              <label className="block">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Hoe heb je ze gevonden? Wat is de context?"
                />
              </label>
            </Section>

            {error && (
              <div
                className="rounded-lg border p-2 text-xs"
                style={{
                  background: "#FEE2E2",
                  borderColor: "#FCA5A5",
                  color: "#991B1B",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Rechterkolom: calculator */}
          <aside
            className="rounded-xl border p-4 lg:sticky lg:top-24 lg:self-start"
            style={{ background: "#F7FBFD", borderColor: "var(--border)" }}
          >
            <MiniPricingCalculator onInject={handleInject} />
          </aside>

          {/* Footer-knoppen */}
          <div
            className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t bg-white px-6 py-3 lg:col-span-2"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--border)" }}
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#FF8441" }}
            >
              {submitting ? "Bezig..." : "Aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="space-y-2 rounded-xl border bg-white p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        {title}
      </h4>
      {children}
    </div>
  );
}

function TextField({
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
