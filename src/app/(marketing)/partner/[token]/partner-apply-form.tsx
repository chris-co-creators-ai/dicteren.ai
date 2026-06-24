"use client";

import { useState } from "react";

// Aanmeld-formulier op de deck-pagina. De prospect bevestigt zijn bedrijf en levert
// meteen de brand identity aan die sectie 07 van het deck vraagt: merkkleur, logo,
// portretfoto, een aanbeveling en een introtekst. Alleen bedrijfsnaam + consent zijn
// verplicht; de rest mag de AM later navragen. Dit zet de lead op "Aangemeld" + een
// AM-taak. Honeypot + server-side rate-limit tegen bots. Uploads gaan via een
// presigned URL direct naar R2 en zijn optioneel (een mislukte upload blokkeert de
// aanmelding niet).

type UploadKind = "logo" | "portrait";
type UploadState = {
  key: string | null;
  preview: string | null;
  status: "idle" | "uploading" | "done" | "error";
  error: string;
};

const EMPTY_UPLOAD: UploadState = {
  key: null,
  preview: null,
  status: "idle",
  error: "",
};

function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function PartnerApplyForm({
  token,
  companyName,
}: {
  token: string;
  companyName?: string | null;
}) {
  const [company, setCompany] = useState(companyName ?? "");
  const [brandColor, setBrandColor] = useState("#042660");
  const [brandColorOn, setBrandColorOn] = useState(false);
  const [quote, setQuote] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [intro, setIntro] = useState("");
  const [logo, setLogo] = useState<UploadState>(EMPTY_UPLOAD);
  const [portrait, setPortrait] = useState<UploadState>(EMPTY_UPLOAD);
  const [consent, setConsent] = useState(false);
  const [website2, setWebsite2] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const introWords = countWords(intro);

  async function handleUpload(kind: UploadKind, file: File | undefined) {
    if (!file) return;
    const setUp = kind === "logo" ? setLogo : setPortrait;
    setUp({
      key: null,
      preview: URL.createObjectURL(file),
      status: "uploading",
      error: "",
    });
    try {
      const signRes = await fetch(
        `/api/partner/${encodeURIComponent(token)}/upload`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        },
      );
      const signData = (await signRes.json()) as {
        success?: boolean;
        error?: string;
        data?: { url: string; key: string };
      };
      if (!signRes.ok || !signData.success || !signData.data) {
        throw new Error(signData.error ?? "Upload mislukt");
      }
      const putRes = await fetch(signData.data.url, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload mislukt");
      setUp((s) => ({ ...s, key: signData.data!.key, status: "done" }));
    } catch (e) {
      setUp((s) => ({
        ...s,
        status: "error",
        error: e instanceof Error ? e.message : "Upload mislukt",
      }));
    }
  }

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
            brandColor: brandColorOn ? brandColor : null,
            quote,
            quoteAuthor,
            introText: intro,
            logoR2Key: logo.key,
            portraitR2Key: portrait.key,
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

  const fieldCls =
    "mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-4 py-2.5 text-base outline-none focus:border-[color:var(--navy)]";

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
          className={fieldCls}
        />
      </label>

      {/* Brand identity — optioneel, voor de eigen landingpagina (sectie 07) */}
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        Jouw merk (optioneel — anders vragen we het later na)
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {/* Logo */}
        <div>
          <span className="text-sm font-semibold text-[color:var(--navy)]">
            Bedrijfslogo
          </span>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[color:var(--border-soft)] px-4 py-3 text-sm text-[color:var(--text-muted)] hover:border-[color:var(--navy)]">
            {logo.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.preview}
                alt="logo"
                className="size-10 rounded object-contain"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded bg-[color:var(--aqua-50)] text-[color:var(--navy)]">
                +
              </span>
            )}
            <span>
              {logo.status === "uploading"
                ? "Uploaden…"
                : logo.status === "done"
                  ? "Logo toegevoegd"
                  : "SVG of PNG, transparant"}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => handleUpload("logo", e.target.files?.[0])}
            />
          </label>
          {logo.error && (
            <p className="mt-1 text-xs text-[color:var(--red)]">{logo.error}</p>
          )}
        </div>

        {/* Portret */}
        <div>
          <span className="text-sm font-semibold text-[color:var(--navy)]">
            Portretfoto
          </span>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[color:var(--border-soft)] px-4 py-3 text-sm text-[color:var(--text-muted)] hover:border-[color:var(--navy)]">
            {portrait.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portrait.preview}
                alt="portret"
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-[color:var(--aqua-50)] text-[color:var(--navy)]">
                +
              </span>
            )}
            <span>
              {portrait.status === "uploading"
                ? "Uploaden…"
                : portrait.status === "done"
                  ? "Foto toegevoegd"
                  : "Hoge resolutie"}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleUpload("portrait", e.target.files?.[0])}
            />
          </label>
          {portrait.error && (
            <p className="mt-1 text-xs text-[color:var(--red)]">
              {portrait.error}
            </p>
          )}
        </div>
      </div>

      {/* Merkkleur */}
      <label className="mt-4 flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={brandColorOn}
          onChange={(e) => setBrandColorOn(e.target.checked)}
        />
        <span className="font-semibold text-[color:var(--navy)]">Merkkleur</span>
        {brandColorOn && (
          <>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-[color:var(--border-soft)] bg-white"
            />
            <span className="text-[color:var(--text-muted)]">{brandColor}</span>
          </>
        )}
      </label>

      {/* Introtekst */}
      <label className="mt-6 block">
        <span className="text-sm font-semibold text-[color:var(--navy)]">
          Introtekst{" "}
          <span className="font-normal text-[color:var(--text-muted)]">
            (60–100 woorden over jou)
          </span>
        </span>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          maxLength={1200}
          rows={4}
          placeholder="Wie ben je, wat doe je, en waarom past Dicteren.ai bij je klanten?"
          className={fieldCls}
        />
        <span
          className={`mt-1 block text-xs ${
            intro && (introWords < 60 || introWords > 100)
              ? "text-[color:var(--orange-600)]"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          {introWords} woorden
        </span>
      </label>

      {/* Aanbeveling */}
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[color:var(--navy)]">
          Aanbeveling{" "}
          <span className="font-normal text-[color:var(--text-muted)]">
            (optioneel)
          </span>
        </span>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          maxLength={600}
          rows={3}
          placeholder="Waarom raad je Dicteren.ai aan?"
          className={fieldCls}
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
            className={fieldCls}
          />
        </label>
      )}

      <label className="mt-6 flex items-start gap-3 text-sm text-[color:var(--text-muted)]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          Dicteren.ai mag contact met me opnemen en mijn bedrijfsnaam, logo en
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
