"use client";

import { useState } from "react";

// Aanmeld-formulier op de deck-pagina. De prospect bevestigt zijn bedrijf en
// levert optioneel een aanbeveling. Dit zet de lead op "Aangemeld" + een taak
// voor de AM. Logo-upload volgt in een aparte stap. Honeypot + server-side
// rate-limit tegen bots.
export function PartnerApplyForm({
  token,
  companyName,
}: {
  token: string;
  companyName?: string | null;
}) {
  const [company, setCompany] = useState(companyName ?? "");
  const [quote, setQuote] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [consent, setConsent] = useState(false);
  const [website2, setWebsite2] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!company.trim()) {
      setError("Vul je bedrijfsnaam in.");
      return;
    }
    if (!consent) {
      setError("Geef akkoord om verder te gaan.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(
        `/api/partner/${encodeURIComponent(token)}/apply`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            companyName: company,
            quote,
            quoteAuthor,
            consent,
            website2,
          }),
        },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setStatus("error");
        setError(data.error ?? "Er ging iets mis. Probeer het opnieuw.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Er ging iets mis. Probeer het opnieuw.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-8 text-center">
        <h3 className="text-xl font-bold text-[color:var(--navy)]">
          Bedankt, top dat je meedoet.
        </h3>
        <p className="mt-2 text-[color:var(--text-muted)]">
          We nemen binnen één werkdag contact met je op.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 sm:p-8"
    >
      <input
        type="text"
        name="website2"
        value={website2}
        onChange={(e) => setWebsite2(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
      <label className="block">
        <span className="text-sm font-semibold text-[color:var(--navy)]">
          Bedrijfsnaam
        </span>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={200}
          required
          className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-4 py-2.5 text-base outline-none focus:border-[color:var(--navy)]"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-[color:var(--navy)]">
          Aanbeveling <span className="font-normal text-[color:var(--text-muted)]">(optioneel)</span>
        </span>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          maxLength={600}
          rows={3}
          placeholder="Waarom raad je Dicteren.ai aan?"
          className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-4 py-2.5 text-base outline-none focus:border-[color:var(--navy)]"
        />
      </label>

      {quote.trim() && (
        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[color:var(--navy)]">
            Naam en functie bij de aanbeveling
          </span>
          <input
            value={quoteAuthor}
            onChange={(e) => setQuoteAuthor(e.target.value)}
            maxLength={120}
            className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-4 py-2.5 text-base outline-none focus:border-[color:var(--navy)]"
          />
        </label>
      )}

      <label className="mt-5 flex items-start gap-3 text-sm text-[color:var(--text-muted)]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          Dicteren.ai mag contact met me opnemen en mijn bedrijfsnaam en
          aanbeveling gebruiken voor het partnerprogramma.
        </span>
      </label>

      {error && (
        <p className="mt-4 text-sm text-[color:var(--red,#c0392b)]">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn btn-primary mt-6 w-full justify-center"
      >
        {status === "sending" ? "Versturen…" : "Ja, ik wil partner worden"}
      </button>
    </form>
  );
}
