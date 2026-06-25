"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// De aangeleverde brand identity van een partner, voor de AM: altijd zichtbaar (leeg
// of ingevuld) en per veld direct aanpasbaar — geen globale "Bewerken"-knop. Tekst en
// kleur slaan op bij blur; logo/portret kun je vervangen via een upload. Alles gaat
// naar de crm_contact en wordt bij publiceren naar de affiliate gekopieerd.

type BrandIdentity = {
  companyName: string | null;
  brandColor: string | null;
  quote: string | null;
  quoteAuthor: string | null;
  introText: string | null;
  logoUrl: string | null;
  portraitUrl: string | null;
};

const EMPTY: BrandIdentity = {
  companyName: null,
  brandColor: null,
  quote: null,
  quoteAuthor: null,
  introText: null,
  logoUrl: null,
  portraitUrl: null,
};

export function BrandIdentityBlock({ contactId }: { contactId: string }) {
  const [data, setData] = useState<BrandIdentity>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/crm/people/${contactId}/brand-identity`,
      );
      const d = (await res.json()) as { data?: BrandIdentity };
      if (d.data) setData(d.data);
    } catch {
      /* stil */
    } finally {
      setLoaded(true);
    }
  }, [contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flashSaved = useCallback((key: string) => {
    setSavedKey(key);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedKey(null), 1500);
  }, []);

  // Sla één veld op (partial PATCH). bodyKey = wat de API verwacht.
  const save = useCallback(
    async (bodyKey: string, value: string | null) => {
      try {
        const res = await fetch(
          `/api/admin/crm/people/${contactId}/brand-identity`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ [bodyKey]: value }),
          },
        );
        const d = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !d.success) {
          toast.error(d.error ?? "Opslaan mislukt");
          return false;
        }
        flashSaved(bodyKey);
        return true;
      } catch {
        toast.error("Opslaan mislukt");
        return false;
      }
    },
    [contactId, flashSaved],
  );

  async function uploadImage(kind: "logo" | "portrait", file: File | undefined) {
    if (!file) return;
    try {
      const signRes = await fetch(
        `/api/admin/crm/people/${contactId}/brand-upload`,
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
        toast.error(signData.error ?? "Upload mislukt");
        return;
      }
      const putRes = await fetch(signData.data.url, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        toast.error("Upload mislukt");
        return;
      }
      const bodyKey = kind === "logo" ? "logoR2Key" : "portraitR2Key";
      if (await save(bodyKey, signData.data.key)) await load();
    } catch {
      toast.error("Upload mislukt");
    }
  }

  if (!loaded) return null;

  return (
    <div className="mt-3 rounded-xl border border-[color:var(--border-soft)] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        Brand identity
      </p>

      {/* Afbeeldingen */}
      <div className="mt-2 flex gap-3">
        <ImageSlot
          label="Logo"
          url={data.logoUrl}
          round={false}
          onPick={(f) => void uploadImage("logo", f)}
        />
        <ImageSlot
          label="Portret"
          url={data.portraitUrl}
          round
          onPick={(f) => void uploadImage("portrait", f)}
        />
      </div>

      {/* Velden — per stuk opslaan bij blur */}
      <div className="mt-3 space-y-2.5">
        <FieldText
          label="Bedrijfsnaam"
          value={data.companyName}
          saved={savedKey === "companyName"}
          onSave={(v) => {
            setData((d) => ({ ...d, companyName: v }));
            void save("companyName", v);
          }}
        />
        <ColorField
          value={data.brandColor}
          saved={savedKey === "brandColor"}
          onSave={(v) => {
            setData((d) => ({ ...d, brandColor: v }));
            void save("brandColor", v);
          }}
        />
        <FieldText
          label="Aanbeveling (quote)"
          value={data.quote}
          textarea
          saved={savedKey === "quote"}
          onSave={(v) => {
            setData((d) => ({ ...d, quote: v }));
            void save("quote", v);
          }}
        />
        <FieldText
          label="Naam bij de quote"
          value={data.quoteAuthor}
          saved={savedKey === "quoteAuthor"}
          onSave={(v) => {
            setData((d) => ({ ...d, quoteAuthor: v }));
            void save("quoteAuthor", v);
          }}
        />
        <FieldText
          label="Introtekst"
          value={data.introText}
          textarea
          saved={savedKey === "introText"}
          onSave={(v) => {
            setData((d) => ({ ...d, introText: v }));
            void save("introText", v);
          }}
        />
      </div>
    </div>
  );
}

const fieldCls =
  "mt-1 w-full rounded-md border border-[color:var(--border-soft)] bg-white px-2.5 py-1.5 text-xs text-[color:var(--navy)] outline-none focus:border-[color:var(--navy)]";

function Label({ children, saved }: { children: string; saved: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-[color:var(--text-muted)]">
      {children}
      {saved && <span className="text-[color:#1F8A4C]">✓ opgeslagen</span>}
    </span>
  );
}

function FieldText({
  label,
  value,
  textarea,
  saved,
  onSave,
}: {
  label: string;
  value: string | null;
  textarea?: boolean;
  saved: boolean;
  onSave: (v: string | null) => void;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  const commit = () => {
    const next = v.trim() ? v : "";
    if ((value ?? "") !== next) onSave(next || null);
  };
  return (
    <label className="block">
      <Label saved={saved}>{label}</Label>
      {textarea ? (
        <textarea
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          rows={2}
          className={fieldCls}
        />
      ) : (
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          className={fieldCls}
        />
      )}
    </label>
  );
}

function ColorField({
  value,
  saved,
  onSave,
}: {
  value: string | null;
  saved: boolean;
  onSave: (v: string | null) => void;
}) {
  const current = value ?? "#042660";
  return (
    <div className="block">
      <Label saved={saved}>Merkkleur</Label>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={current}
          onChange={(e) => onSave(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-[color:var(--border-soft)]"
        />
        <span className="font-mono text-xs text-[color:var(--navy)]">
          {value ?? "geen"}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onSave(null)}
            className="text-[0.6875rem] text-[color:var(--text-muted)] underline"
          >
            wissen
          </button>
        )}
      </span>
    </div>
  );
}

function ImageSlot({
  label,
  url,
  round,
  onPick,
}: {
  label: string;
  url: string | null;
  round: boolean;
  onPick: (f: File | undefined) => void;
}) {
  return (
    <label className="cursor-pointer">
      <span className="text-[0.625rem] text-[color:var(--text-muted)]">{label}</span>
      <span
        className={`mt-1 grid size-14 place-items-center overflow-hidden border border-dashed border-[color:var(--border-soft)] bg-[color:var(--aqua-50)] text-[0.625rem] text-[color:var(--text-muted)] hover:border-[color:var(--navy)] ${
          round ? "rounded-full" : "rounded-md"
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className={`size-full ${round ? "object-cover" : "object-contain"}`}
          />
        ) : (
          "+ upload"
        )}
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </label>
  );
}
