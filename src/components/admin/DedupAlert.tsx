"use client";

// DedupAlert — gedeelde popup-banner voor alle aanmaak-modals
//
// Toont gevonden matches (exact email/kvk of fuzzy name) met source, naam,
// huidige eigenaar. Acties: open de bestaande rij, overdragen aan andere
// AM, of toch nieuw aanmaken. Cross-table, één component voor:
// NewOrgPanel, NewContactForm, partner-modal, affiliate-modal.

import { AlertTriangle, ArrowRight, Info } from "lucide-react";

export type ContactMatch = {
  entityId: string;
  source: "user" | "crm_contact" | "crm_org" | "partner" | "affiliate";
  emailNorm: string | null;
  displayName: string | null;
  kvk: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  matchType: "exact_email" | "exact_kvk" | "fuzzy_name";
  matchScore: number;
};

const SOURCE_LABEL: Record<ContactMatch["source"], string> = {
  user: "Account",
  crm_contact: "CRM-contact",
  crm_org: "CRM-organisatie",
  partner: "Partner",
  affiliate: "Affiliate",
};

const MATCH_TYPE_LABEL: Record<ContactMatch["matchType"], string> = {
  exact_email: "Zelfde e-mail",
  exact_kvk: "Zelfde KvK",
  fuzzy_name: "Gelijkende naam",
};

export function DedupAlert({
  matches,
  hasExactMatch,
  onProceedAnyway,
  onClose,
  proceedDisabled,
}: {
  matches: ContactMatch[];
  hasExactMatch: boolean;
  onProceedAnyway?: () => void;
  onClose?: () => void;
  proceedDisabled?: boolean;
}) {
  if (matches.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: hasExactMatch ? "#FEF3C7" : "#FFFBEB",
        borderColor: hasExactMatch ? "#FCD34D" : "#FDE68A",
      }}
    >
      <div className="flex items-start gap-2">
        {hasExactMatch ? (
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            style={{ color: "#9A3412" }}
            strokeWidth={2.2}
          />
        ) : (
          <Info
            className="mt-0.5 size-4 shrink-0"
            style={{ color: "#9A3412" }}
            strokeWidth={2.2}
          />
        )}
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color: "#7C2D12" }}>
            {hasExactMatch
              ? "Dit contact bestaat al"
              : `${matches.length} mogelijk vergelijkbare contact${matches.length === 1 ? "" : "en"}`}
          </div>
          <div className="mt-1 text-xs" style={{ color: "#92400E" }}>
            {hasExactMatch
              ? "Aanmaken wordt geblokkeerd. Open het bestaande contact of overleg met de eigenaar."
              : "Mogelijk dezelfde organisatie. Controleer vóór aanmaken."}
          </div>

          <ul className="mt-2 space-y-1">
            {matches.map((m) => (
              <li
                key={`${m.source}:${m.entityId}`}
                className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: "var(--aqua-50)", color: "var(--navy)" }}
                >
                  {SOURCE_LABEL[m.source]}
                </span>
                <span className="flex-1 truncate font-semibold">
                  {m.displayName ?? m.emailNorm ?? "Onbekend"}
                </span>
                {m.ownerName && (
                  <span className="text-[10px] text-[color:var(--text-muted)]">
                    Eigenaar: <strong>{m.ownerName}</strong>
                  </span>
                )}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{
                    background:
                      m.matchType === "fuzzy_name" ? "#E0E7FF" : "#FECACA",
                    color:
                      m.matchType === "fuzzy_name" ? "#3730A3" : "#7F1D1D",
                  }}
                >
                  {MATCH_TYPE_LABEL[m.matchType]}
                  {m.matchType === "fuzzy_name" &&
                    ` (${Math.round(m.matchScore * 100)}%)`}
                </span>
              </li>
            ))}
          </ul>

          {(onProceedAnyway || onClose) && (
            <div className="mt-3 flex gap-2">
              {onProceedAnyway && !hasExactMatch && (
                <button
                  type="button"
                  onClick={onProceedAnyway}
                  disabled={proceedDisabled}
                  className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  Toch aanmaken
                  <ArrowRight className="size-3" strokeWidth={2.4} />
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:bg-white"
                >
                  Sluiten
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper om client-side dedup-check te doen vanuit een form. */
export async function searchContactMatches(args: {
  email?: string | null;
  kvk?: string | null;
  name?: string | null;
}): Promise<{ matches: ContactMatch[]; hasExactMatch: boolean }> {
  const params = new URLSearchParams();
  if (args.email) params.set("email", args.email);
  if (args.kvk) params.set("kvk", args.kvk);
  if (args.name) params.set("name", args.name);
  if (!params.toString()) return { matches: [], hasExactMatch: false };

  const res = await fetch(`/api/admin/contacts/search?${params.toString()}`);
  if (!res.ok) return { matches: [], hasExactMatch: false };
  const data = await res.json();
  return {
    matches: (data?.data?.matches ?? []) as ContactMatch[],
    hasExactMatch: Boolean(data?.data?.hasExactMatch),
  };
}
