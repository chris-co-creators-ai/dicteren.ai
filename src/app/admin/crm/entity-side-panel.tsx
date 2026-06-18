"use client";

// De gedeelde CRM side-panel-shell. Twee modi: "person" (een crm_contact /
// auth.user uit de Personen-tab) en "org" (een crm_organization uit de
// Organisaties-tab). De shell levert alleen de chrome — kop, zones, tab-bar,
// body, override-rij, modal/docked-positionering. De content komt via slots,
// zodat /personen en /organisaties dezelfde structuur tonen met eigen data.
//
// Zone-volgorde (vast): kop → progressie → NU → tabs+body → override.
// progress + now zijn alleen gevuld in persoon-modus met funnel-state.

import { X } from "lucide-react";
import type { ReactNode } from "react";

export type SidePanelMode = "person" | "org";

export type SidePanelTabDef = {
  key: string;
  label: string;
  /** Optioneel getal/teken naast het label (bv. aantal open taken). */
  badge?: number | string | null;
};

export type SidePanelLink = {
  /** Bv. "Bekijk organisatie" of "Bekijk contactpersoon". */
  label: string;
  onJump: () => void;
} | null;

export type EntitySidePanelProps = {
  mode: SidePanelMode;
  /** Gedockt = kaal rechterpaneel zonder overlay (Personen-grid). */
  docked?: boolean;
  /** Breedte in modal-modus. Org gebruikt max-w-2xl, persoon max-w-md. */
  maxWidthClass?: string;

  // Kop
  /** Kleine chip boven de titel (segment bij persoon, niets bij org). */
  eyebrow?: ReactNode;
  title: string;
  /** Meta-regel(s) onder de titel: e-mail/rol/telefoon of status/bron/KvK. */
  titleMeta?: ReactNode;
  /** Spring-link naar de gekoppelde entiteit (sync persoon ↔ org). */
  link?: SidePanelLink;

  // Zones boven de tabs (altijd zichtbaar als gevuld)
  progress?: ReactNode;
  now?: ReactNode;

  // Tabs
  tabs: SidePanelTabDef[];
  activeTab: string;
  onTabChange: (key: string) => void;

  // Body
  loading?: boolean;
  loadingLabel?: string;
  /** False als de actieve tab z'n eigen scroll regelt (bv. Details). */
  scrollBody?: boolean;
  children: ReactNode;

  // Voet
  override?: ReactNode;
  onClose: () => void;
};

export function EntitySidePanel({
  docked = false,
  maxWidthClass = "max-w-2xl",
  eyebrow,
  title,
  titleMeta,
  link,
  progress,
  now,
  tabs,
  activeTab,
  onTabChange,
  loading = false,
  loadingLabel = "Laden…",
  scrollBody = true,
  children,
  override,
  onClose,
}: EntitySidePanelProps) {
  const inner = (
    <div
      onClick={docked ? undefined : (e) => e.stopPropagation()}
      className={
        docked
          ? "flex h-full w-full flex-col bg-white"
          : `ml-auto flex h-full w-full ${maxWidthClass} flex-col bg-white shadow-2xl`
      }
    >
      {/* Kop — vast bovenin */}
      <div
        className="shrink-0 border-b bg-white px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow}
            <h2 className="truncate text-lg font-bold text-[color:var(--navy)]">
              {title}
            </h2>
            {titleMeta && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {titleMeta}
              </div>
            )}
            {link && (
              <button
                type="button"
                onClick={link.onJump}
                className="mt-1.5 text-xs font-semibold text-[color:var(--navy)] underline underline-offset-2 hover:opacity-80"
              >
                {link.label} →
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[color:var(--bg)]"
            aria-label="Sluiten"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        {/* Tab-bar */}
        {tabs.length > 0 && (
          <div className="mt-2.5 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onTabChange(t.key)}
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  activeTab === t.key
                    ? "bg-[color:var(--navy)] text-white"
                    : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
                }`}
              >
                {t.label}
                {t.badge != null && t.badge !== "" && (
                  <span
                    className={`rounded-full px-1.5 text-[0.625rem] ${
                      activeTab === t.key
                        ? "bg-white/20 text-white"
                        : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progressie + NU — alleen zichtbaar als gevuld (funnel in persoon-modus) */}
      {(progress || now) && (
        <div
          className="shrink-0 space-y-3 border-b bg-[color:var(--bg)] px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          {progress}
          {now}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="flex-1 px-4 py-12 text-center text-sm text-[color:var(--text-muted)]">
          {loadingLabel}
        </div>
      ) : scrollBody ? (
        <div className="scroll-visible min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      ) : (
        children
      )}

      {/* Override-rij — los van de stage altijd bereikbaar */}
      {override && (
        <div
          className="shrink-0 border-t bg-white px-4 py-2.5"
          style={{ borderColor: "var(--border)" }}
        >
          {override}
        </div>
      )}
    </div>
  );

  if (docked) return inner;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      {inner}
    </div>
  );
}
