"use client";

// Account-signalen-blok (PRD crm-inbound-outbound-split, Fase 5).
// Toont in de /crm persoon- + org-side-panels welke login-accounts dit
// e-mailadres / e-maildomein delen. Een prospect die zelf een trial startte = heet;
// meerdere accounts op één zakelijk domein = team-/upsell-haak. Intern admin-blok.

import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";

type Item = {
  userId: string;
  name: string;
  email: string;
  accountType: string | null;
  createdAt: string;
};
type Signals = {
  domain: string | null;
  isFreeDomain: boolean;
  self: Item | null;
  domainAccounts: {
    total: number;
    personal: number;
    business: number;
    items: Item[];
  };
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AccountSignalsBlock({
  email,
  domain,
}: {
  email?: string | null;
  domain?: string | null;
}) {
  const [data, setData] = useState<Signals | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const p = new URLSearchParams();
    if (email) p.set("email", email);
    if (domain) p.set("domain", domain);
    if (!email && !domain) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    fetch(`/api/admin/crm/account-signals?${p.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Signals | null) => {
        if (active) {
          setData(d);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [email, domain]);

  // Stil tot er een echt signaal is — geen lege chrome in het panel.
  if (!loaded || !data) return null;
  const hasSelf = !!data.self;
  const da = data.domainAccounts;
  const showDomain = !!data.domain && !data.isFreeDomain && da.total > 0;
  if (!hasSelf && !showDomain) return null;

  const others = da.items.filter((i) => !data.self || i.userId !== data.self.userId);

  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--navy)]">
        <UserCheck className="size-3.5" strokeWidth={2.2} />
        Account-signalen
      </div>

      {hasSelf && (
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Deze persoon heeft zelf een account (
          {data.self!.accountType === "business" ? "zakelijk" : "persoonlijk"}),
          sinds {fmt(data.self!.createdAt)}.
        </p>
      )}

      {showDomain && (
        <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">
          {da.total} {da.total === 1 ? "account" : "accounts"} op{" "}
          <span className="font-semibold">@{data.domain}</span>
          {da.personal > 0 && <> — waarvan {da.personal} persoonlijk</>}
          {da.business > 0 && <>, {da.business} zakelijk</>}.
        </p>
      )}

      {others.length > 0 && (
        <ul className="mt-2 space-y-1">
          {others.slice(0, 5).map((i) => (
            <li
              key={i.userId}
              className="flex items-center justify-between gap-2 text-[0.6875rem]"
            >
              <span className="truncate text-[color:var(--text)]">
                {i.name || i.email}
              </span>
              <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 font-semibold text-[color:var(--text-muted)]">
                {i.accountType === "business" ? "zakelijk" : "persoonlijk"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <a
        href="/admin/users"
        className="mt-2 inline-block text-[0.6875rem] font-semibold text-[color:var(--navy)] underline underline-offset-2"
      >
        Bekijk in /admin/users →
      </a>
    </div>
  );
}
