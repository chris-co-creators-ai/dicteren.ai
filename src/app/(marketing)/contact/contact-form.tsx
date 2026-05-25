"use client";

import { useState } from "react";

type Kind = "general" | "sales" | "support" | "quote_request";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "general", label: "Algemene vraag" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "quote_request", label: "Offerte / maatwerk" },
];

export function ContactForm() {
  const [kind, setKind] = useState<Kind>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          name,
          email,
          company: company || null,
          phone: phone || null,
          subject: subject || null,
          message,
          metadata: { website },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Versturen mislukt.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setSubmitting(false);
    } catch {
      setError("Netwerkprobleem — probeer opnieuw.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-6">
        <h3 className="text-lg font-bold text-green-900">
          Bedankt — bericht ontvangen
        </h3>
        <p className="mt-2 text-sm text-green-800">
          We reageren binnen één werkdag op <strong>{email}</strong>. Tot snel.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 brand-card p-6">
      <div className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Onderwerp
        </span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="input"
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam" required>
          <input
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="E-mail" required>
          <input
            required
            type="email"
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Bedrijf">
          <input
            maxLength={200}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Telefoon">
          <input
            maxLength={50}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Korte titel (optioneel)">
        <input
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input"
          placeholder="bv. Offerte 25 seats notarispraktijk"
        />
      </Field>

      <Field label="Bericht" required>
        <textarea
          required
          minLength={10}
          maxLength={8000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input min-h-[150px]"
        />
      </Field>

      {/* Honeypot — verborgen voor mensen, gevuld door bots */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[0.6875rem] text-[color:var(--text-soft)]">
          We verwerken je gegevens conform onze{" "}
          <a href="/privacy" className="underline">
            privacyverklaring
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting ? "Versturen…" : "Verstuur bericht"}
        </button>
      </div>
    </form>
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
      <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}{" "}
        {required && <span className="text-[color:var(--orange)]">*</span>}
      </span>
      {children}
    </label>
  );
}
