"use client";

import { useState } from "react";
import { BuyButton } from "@/components/checkout/buy-button";
import type { ConsumerPlanOption } from "@/lib/services/order";

const PERIOD_LABEL: Record<string, string> = {
  monthly: "per maand",
  quarterly: "per kwartaal",
  yearly: "per jaar",
};

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function PlanPicker({ plans }: { plans: ConsumerPlanOption[] }) {
  // Default op het jaarplan (goedkoopst per maand) als dat bestaat.
  const yearly = plans.find((p) => p.period === "yearly");
  const [selected, setSelected] = useState(yearly?.slug ?? plans[0]?.slug ?? "");

  if (plans.length === 0) return null;

  const active = plans.find((p) => p.slug === selected) ?? plans[0];

  return (
    <div className="mt-8 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
      <div className="text-sm font-semibold">Kies je abonnement</div>
      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
        Direct toegang tot de volledige app. Je kunt op elk moment opzeggen.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {plans.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setSelected(p.slug)}
            className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
              p.slug === selected
                ? "border-[color:var(--navy)] bg-[color:var(--bg)]"
                : "border-[color:var(--border-soft)] hover:border-[color:var(--navy)]"
            }`}
          >
            <span className="text-xs font-semibold text-[color:var(--text-muted)]">
              {PERIOD_LABEL[p.period] ?? p.period}
            </span>
            <span className="text-lg font-bold text-[color:var(--navy)]">
              {eur(p.priceCents)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <BuyButton
          planSlug={active.slug}
          kind="consumer"
          label={`Abonneer — ${eur(active.priceCents)} ${PERIOD_LABEL[active.period] ?? ""}`}
          className="btn btn-primary w-full"
          redirectAfterAuth="/account/billing"
        />
      </div>
      <p className="mt-2 text-[0.6875rem] text-[color:var(--text-soft)]">
        Je betaalt via iDEAL of creditcard. Bedragen zijn incl. btw.
      </p>
    </div>
  );
}
