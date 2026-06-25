"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// De aangeleverde brand identity van een partner, voor de AM: bekijken + finetunen
// (merkkleur, quote, introtekst) vóór publiceren. Logo/portret worden getoond via
// een signed URL; bewerken van de afbeeldingen zelf gaat (nog) niet hier.

type BrandIdentity = {
  companyName: string | null;
  brandColor: string | null;
  quote: string | null;
  quoteAuthor: string | null;
  introText: string | null;
  logoUrl: string | null;
  portraitUrl: string | null;
};

export function BrandIdentityBlock({ contactId }: { contactId: string }) {
  const [data, setData] = useState<BrandIdentity | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    brandColor: "#042660",
    quote: "",
    quoteAuthor: "",
    introText: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/crm/people/${contactId}/brand-identity`,
      );
      const d = (await res.json()) as { data?: BrandIdentity };
      if (d.data) {
        setData(d.data);
        setForm({
          companyName: d.data.companyName ?? "",
          brandColor: d.data.brandColor ?? "#042660",
          quote: d.data.quote ?? "",
          quoteAuthor: d.data.quoteAuthor ?? "",
          introText: d.data.introText ?? "",
        });
      }
    } catch {
      setData(null);
    } finally {
      setLoaded(true);
    }
  }, [contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/crm/people/${contactId}/brand-identity`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const d = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !d.success) {
        toast.error(d.error ?? "Opslaan mislukt");
      } else {
        toast.success("Brand identity opgeslagen");
        setEditing(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;
  if (!data) return null;

  const hasAny =
    data.brandColor ||
    data.quote ||
    data.introText ||
    data.logoUrl ||
    data.portraitUrl;

  const field =
    "mt-1 w-full rounded-md border border-[color:var(--border-soft)] bg-white px-2.5 py-1.5 text-xs text-[color:var(--navy)] outline-none focus:border-[color:var(--navy)]";

  return (
    <div className="mt-3 rounded-xl border border-[color:var(--border-soft)] bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Brand identity
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-[color:var(--navy)] underline underline-offset-2"
          >
            {hasAny ? "Bewerken" : "Aanvullen"}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-2 space-y-2 text-xs">
          {!hasAny && (
            <p className="text-[color:var(--text-muted)]">
              De partner heeft nog geen brand identity aangeleverd.
            </p>
          )}
          {(data.logoUrl || data.portraitUrl) && (
            <div className="flex gap-3">
              {data.logoUrl && (
                <div>
                  <p className="text-[0.625rem] text-[color:var(--text-muted)]">Logo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.logoUrl}
                    alt="logo"
                    className="mt-1 h-12 w-auto rounded border border-[color:var(--border-soft)] object-contain"
                  />
                </div>
              )}
              {data.portraitUrl && (
                <div>
                  <p className="text-[0.625rem] text-[color:var(--text-muted)]">Portret</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.portraitUrl}
                    alt="portret"
                    className="mt-1 size-12 rounded-full border border-[color:var(--border-soft)] object-cover"
                  />
                </div>
              )}
            </div>
          )}
          {data.brandColor && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-4 rounded border border-[color:var(--border-soft)]"
                style={{ background: data.brandColor }}
              />
              <span className="font-mono text-[color:var(--text-muted)]">
                {data.brandColor}
              </span>
            </div>
          )}
          {data.quote && (
            <p className="italic text-[color:var(--navy)]">
              &ldquo;{data.quote}&rdquo;
              {data.quoteAuthor ? (
                <span className="not-italic text-[color:var(--text-muted)]">
                  {" "}
                  — {data.quoteAuthor}
                </span>
              ) : null}
            </p>
          )}
          {data.introText && (
            <p className="text-[color:var(--text-muted)]">{data.introText}</p>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="block text-xs font-medium text-[color:var(--text-muted)]">
            Bedrijfsnaam
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-[color:var(--text-muted)]">
            Merkkleur
            <span className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={form.brandColor}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                className="h-7 w-10 cursor-pointer rounded border border-[color:var(--border-soft)]"
              />
              <span className="font-mono text-[color:var(--navy)]">{form.brandColor}</span>
            </span>
          </label>
          <label className="block text-xs font-medium text-[color:var(--text-muted)]">
            Aanbeveling (quote)
            <textarea
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
              rows={2}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-[color:var(--text-muted)]">
            Naam bij de quote
            <input
              value={form.quoteAuthor}
              onChange={(e) => setForm({ ...form, quoteAuthor: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-[color:var(--text-muted)]">
            Introtekst
            <textarea
              value={form.introText}
              onChange={(e) => setForm({ ...form, introText: e.target.value })}
              rows={3}
              className={field}
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-md bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                void load();
              }}
              className="rounded-md border border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)]"
            >
              Annuleren
            </button>
          </div>
          <p className="text-[0.625rem] text-[color:var(--text-muted)]">
            Logo/portret kan de partner zelf aanleveren; vervangen doe je na publiceren in /admin/affiliates.
          </p>
        </div>
      )}
    </div>
  );
}
