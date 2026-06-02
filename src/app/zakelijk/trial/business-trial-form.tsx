"use client";

import { useState } from "react";
import Link from "next/link";

type Form = {
  organizationName: string;
  vatNumber: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
};

export function BusinessTrialForm({
  isLoggedIn,
  signUpHref,
  amUserId,
  reseller,
}: {
  isLoggedIn: boolean;
  signUpHref: string;
  amUserId: string | null;
  reseller: boolean;
}) {
  const [f, setF] = useState<Form>({
    organizationName: "",
    vatNumber: "",
    addressLine1: "",
    postalCode: "",
    city: "",
    countryCode: "NL",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; expiresAt: string } | null>(
    null,
  );

  function set<K extends keyof Form>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  if (!isLoggedIn) {
    return (
      <div className="brand-card mt-8 p-6 text-center">
        <p className="text-sm text-[color:var(--text-muted)]">
          Maak eerst een gratis account aan om je proefperiode te starten.
        </p>
        <Link href={signUpHref} className="btn btn-primary mt-4 inline-flex">
          Account aanmaken
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="brand-card mt-8 p-6">
        <h2 className="text-xl font-bold text-[color:var(--navy)]">
          Je proefperiode is gestart
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Je licentiecode (ook per mail verstuurd):
        </p>
        <code className="mt-2 block rounded-lg bg-[color:var(--bg)] px-3 py-2 font-mono text-base font-bold">
          {done.code}
        </code>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Geldig tot {new Date(done.expiresAt).toLocaleDateString("nl-NL")}.
        </p>
        <Link href="/download" className="btn btn-primary mt-5 inline-flex">
          Download de app
        </Link>
      </div>
    );
  }

  async function submit() {
    if (!f.organizationName.trim()) {
      setErr("Bedrijfsnaam is verplicht.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/zakelijk/trial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, amUserId, reseller }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDone({ code: data.license.code, expiresAt: data.license.expiresAt });
      } else {
        setErr(data.error ?? "Er ging iets mis. Probeer opnieuw.");
        setBusy(false);
      }
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="brand-card mt-8 space-y-4 p-6">
      <Field
        label="Bedrijfsnaam *"
        value={f.organizationName}
        onChange={(v) => set("organizationName", v)}
        placeholder="Bedrijfsnaam B.V."
      />
      <Field
        label="BTW-nummer (voor je administratie)"
        value={f.vatNumber}
        onChange={(v) => set("vatNumber", v)}
        placeholder="NL000000000B00"
      />
      <Field
        label="Adres"
        value={f.addressLine1}
        onChange={(v) => set("addressLine1", v)}
        placeholder="Straat en huisnummer"
      />
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Postcode"
          value={f.postalCode}
          onChange={(v) => set("postalCode", v)}
          placeholder="1234 AB"
        />
        <Field
          label="Plaats"
          value={f.city}
          onChange={(v) => set("city", v)}
          placeholder="Amsterdam"
        />
        <Field
          label="Land"
          value={f.countryCode}
          onChange={(v) => set("countryCode", v)}
          placeholder="NL"
        />
      </div>

      {err && (
        <p className="text-sm font-medium text-[color:var(--red)]">{err}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="btn btn-primary w-full"
      >
        {busy ? "Bezig…" : "Start 14 dagen gratis"}
      </button>
      <p className="text-center text-xs text-[color:var(--text-soft)]">
        Geen betaling nodig. Na 14 dagen stopt het vanzelf, tenzij je upgradet.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[color:var(--text)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-[color:var(--border-soft)] px-3 py-2 text-sm outline-none focus:border-[color:var(--orange)]"
        style={{ background: "var(--bg)" }}
      />
    </label>
  );
}
