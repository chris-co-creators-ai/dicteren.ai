"use client";

import { useState } from "react";

export function PartnerForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [targetSegment, setTargetSegment] = useState("");
  const [expectedVolume, setExpectedVolume] = useState("");
  const [message, setMessage] = useState("");
  const [fax, setFax] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partnership", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          phone: phone || null,
          website: website || null,
          targetSegment: targetSegment || null,
          expectedVolume: expectedVolume || null,
          message: message || null,
          metadata: { fax },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmelden mislukt.");
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
      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
        <h3 className="text-lg font-bold text-green-900">Aanmelding ontvangen</h3>
        <p className="mt-2 text-sm text-green-800">
          We beoordelen je aanmelding binnen 2 werkdagen en sturen je een mail
          met de status. Bij goedkeuring krijg je je affiliate-code en login
          voor het dashboard.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-4 brand-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jouw naam" required>
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
        <Field label="Bedrijfsnaam" required>
          <input
            required
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

      <Field label="Website">
        <input
          type="url"
          maxLength={500}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="input"
          placeholder="https://"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Doelgroep / netwerk">
          <input
            maxLength={200}
            value={targetSegment}
            onChange={(e) => setTargetSegment(e.target.value)}
            className="input"
            placeholder="bv. notarissen, MKB, juridische sector"
          />
        </Field>
        <Field label="Verwacht volume">
          <select
            value={expectedVolume}
            onChange={(e) => setExpectedVolume(e.target.value)}
            className="input"
          >
            <option value="">— Kies</option>
            <option value="0-10/maand">0–10 licenties / maand</option>
            <option value="10-50/maand">10–50 licenties / maand</option>
            <option value="50-200/maand">50–200 licenties / maand</option>
            <option value="200+/maand">200+ licenties / maand</option>
          </select>
        </Field>
      </div>

      <Field label="Korte toelichting">
        <textarea
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input min-h-[120px]"
          placeholder="Wat doe je, waarom past Dicteren.ai bij je netwerk, en hoe wil je het verkopen?"
        />
      </Field>

      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <label>
          Fax
          <input
            tabIndex={-1}
            autoComplete="off"
            value={fax}
            onChange={(e) => setFax(e.target.value)}
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
          Door aan te melden ga je akkoord met onze{" "}
          <a href="/voorwaarden" className="underline">
            voorwaarden
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting ? "Versturen…" : "Verstuur aanmelding"}
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
