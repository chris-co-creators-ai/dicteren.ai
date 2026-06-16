"use client";

import { useState } from "react";
import { PricingCalculator } from "./pricing-calculator";
import { PricingEditor } from "./pricing-editor";
import { OfferteCreator } from "./offerte-creator";
import type { PricingSnapshot } from "@/lib/services/pricingTiers";

// Twee gereedschappen op één pagina: de reseller-commissie-calculator (met de
// staffel-editor eronder) en de offerte-creator voor zakelijke eindklanten.

type Tab = "reseller" | "offerte";

export function PricingTabs({
  pricing,
  isAdmin,
  initialTab,
  initialOrgId,
}: {
  pricing: PricingSnapshot;
  isAdmin: boolean;
  initialTab: Tab;
  initialOrgId?: string | null;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const tabBtn = (key: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        tab === key
          ? "text-white"
          : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
      }`}
      style={tab === key ? { background: "var(--navy)" } : undefined}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div
        className="mb-6 inline-flex gap-1 rounded-xl border bg-white p-1"
        style={{ borderColor: "var(--border)" }}
      >
        {tabBtn("reseller", "Reseller-commissie")}
        {tabBtn("offerte", "Offerte zakelijke klant")}
      </div>

      {tab === "reseller" ? (
        <>
          <PricingCalculator />
          <div className="mt-10">
            <PricingEditor initial={pricing} isAdmin={isAdmin} />
          </div>
        </>
      ) : (
        <OfferteCreator initialOrgId={initialOrgId} />
      )}
    </div>
  );
}
