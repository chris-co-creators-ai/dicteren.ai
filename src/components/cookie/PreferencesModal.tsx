"use client";

// Dicteren.ai — Cookie-preferences modal
//
// Granulaire per-categorie keuze. Necessary is altijd aan en niet
// toggleable. AVG: geen pre-selectie boven strictly-necessary, reject
// net zo prominent als accept.

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import type { ConsentState } from "@/lib/consent/types";

type CategoryKey = "necessary" | "functional" | "analytics" | "marketing";

const CATEGORIES: Array<{
  key: CategoryKey;
  title: string;
  description: string;
  examples: string;
  required: boolean;
}> = [
  {
    key: "necessary",
    title: "Noodzakelijk",
    description:
      "Onmisbaar om de site te laten werken: inloggen, sessie onthouden, jouw cookie-keuze bewaren.",
    examples: "Sessie-token, CSRF-cookie, cookie-keuze",
    required: true,
  },
  {
    key: "functional",
    title: "Functioneel",
    description:
      "Onthouden van voorkeuren zoals taal of donker/licht-modus zodat je niet elke keer opnieuw hoeft te kiezen.",
    examples: "Taalvoorkeur, UI-thema",
    required: false,
  },
  {
    key: "analytics",
    title: "Analytisch",
    description:
      "Helpt ons te begrijpen welke pagina's werken en welke niet. Anoniem, geaggregeerd, geen profielen.",
    examples: "Google Analytics 4, Vercel Analytics",
    required: false,
  },
  {
    key: "marketing",
    title: "Marketing",
    description:
      "Stelt ons in staat advertenties te tonen aan mensen die mogelijk geïnteresseerd zijn in Dicteren.ai.",
    examples: "Google Ads remarketing, social-pixels",
    required: false,
  },
];

export function PreferencesModal({
  open,
  initial,
  onClose,
  onSave,
  onAcceptAll,
  onRejectAll,
}: {
  open: boolean;
  initial: ConsentState;
  onClose: () => void;
  onSave: (state: ConsentState) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}) {
  const [state, setState] = useState<ConsentState>(initial);

  useEffect(() => {
    if (open) setState(initial);
  }, [open, initial]);

  if (!open) return null;

  function toggle(key: CategoryKey) {
    if (key === "necessary") return;
    setState((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full hover:bg-[color:var(--bg)]"
        >
          <X className="size-4" />
        </button>

        <div className="border-b border-[color:var(--border-soft)] p-6">
          <h2
            id="cookie-modal-title"
            className="text-xl font-bold text-[color:var(--navy)]"
          >
            Cookie-voorkeuren
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Kies per categorie welke cookies je toestaat. Je kunt dit altijd
            wijzigen via de footer.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-6">
          <ul className="space-y-4">
            {CATEGORIES.map((cat) => {
              const checked = state[cat.key];
              return (
                <li
                  key={cat.key}
                  className="rounded-xl border border-[color:var(--border-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[color:var(--navy)]">
                          {cat.title}
                        </h3>
                        {cat.required && (
                          <span className="rounded-full bg-[color:var(--bg-deep)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--navy)]">
                            Verplicht
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-muted)]">
                        {cat.description}
                      </p>
                      <p className="mt-1.5 text-[11px] text-[color:var(--text-soft)]">
                        Voorbeelden: {cat.examples}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={`${cat.title} ${checked ? "uit" : "aan"}-zetten`}
                      onClick={() => toggle(cat.key)}
                      disabled={cat.required}
                      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        background: checked
                          ? "var(--orange)"
                          : "var(--border-soft)",
                      }}
                    >
                      <span
                        className="inline-block size-5 transform rounded-full bg-white shadow transition-transform"
                        style={{
                          transform: checked
                            ? "translateX(22px)"
                            : "translateX(2px)",
                        }}
                      />
                      {checked && (
                        <Check
                          className="absolute left-1 size-3 text-white"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-2 border-t border-[color:var(--border-soft)] p-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-lg border border-[color:var(--border-soft)] px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[color:var(--bg)]"
          >
            Weiger alles
          </button>
          <button
            type="button"
            onClick={() => onSave(state)}
            className="rounded-lg border border-[color:var(--border-soft)] px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[color:var(--bg)]"
          >
            Mijn keuzes opslaan
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--orange)" }}
          >
            Accepteer alles
          </button>
        </div>
      </div>
    </div>
  );
}
