"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { PlanPicker } from "./plan-picker";
import type { ConsumerPlanOption } from "@/lib/services/order";

type Subscription = {
  id: string;
  mollieSubscriptionId: string;
  status: string;
  intervalLabel: string;
  amountCents: number;
  currency: string;
  seats: number;
  nextBillingAt: string | null;
  canceledAt: string | null;
  planLabel: string | null;
  licenseCode: string | null;
  licenseStatus: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Actief",
  past_due: "Betaling mislukt",
  canceled: "Opgezegd",
  suspended: "Gepauzeerd",
  completed: "Afgelopen",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function BillingView({
  hasCustomer,
  subscriptions,
  consumerPlans = [],
}: {
  hasCustomer: boolean;
  subscriptions: Subscription[];
  consumerPlans?: ConsumerPlanOption[];
}) {
  void hasCustomer;
  const hasActive = subscriptions.some(
    (s) => s.status === "active" || s.status === "past_due",
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Facturering</h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Beheer hier je abonnementen en betaalmethode.
      </p>

      {subscriptions.length > 0 && (
        <div className="mt-8 space-y-4">
          {subscriptions.map((s) => (
            <SubscriptionCard key={s.id} subscription={s} />
          ))}
        </div>
      )}

      {/* Geen actief abonnement → laat de gebruiker er direct één afsluiten. */}
      {!hasActive && <PlanPicker plans={consumerPlans} />}
    </main>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isActive = subscription.status === "active" || subscription.status === "past_due";

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Opzeggen mislukt. Probeer opnieuw.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            {subscription.planLabel ?? "Abonnement"}
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight">
            {formatAmount(subscription.amountCents, subscription.currency)}
            <span className="ml-1 text-sm font-normal text-[color:var(--text-muted)]">
              / {subscription.intervalLabel}
            </span>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
          style={{
            background:
              subscription.status === "active"
                ? "color-mix(in srgb, var(--green) 12%, white)"
                : subscription.status === "past_due"
                  ? "color-mix(in srgb, var(--orange) 12%, white)"
                  : "var(--surface-2)",
            color:
              subscription.status === "active"
                ? "var(--green)"
                : subscription.status === "past_due"
                  ? "var(--orange-600)"
                  : "var(--text-muted)",
          }}
        >
          {STATUS_LABEL[subscription.status] ?? subscription.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <div className="text-[color:var(--text-muted)]">
            {subscription.status === "canceled" ? "Opgezegd op" : "Volgende afschrijving"}
          </div>
          <div className="mt-0.5 font-semibold">
            {subscription.canceledAt
              ? formatDate(subscription.canceledAt)
              : formatDate(subscription.nextBillingAt)}
          </div>
        </div>
        <div>
          <div className="text-[color:var(--text-muted)]">Licentiecode</div>
          <div className="mt-0.5 font-mono text-sm font-semibold">
            {subscription.licenseCode ?? "—"}
          </div>
        </div>
      </div>

      {subscription.status === "past_due" && (
        <div
          className="mt-5 rounded-lg px-4 py-3 text-xs"
          style={{
            background: "color-mix(in srgb, var(--orange) 6%, white)",
            color: "var(--text)",
          }}
        >
          De laatste afschrijving is mislukt. Mollie probeert het automatisch
          opnieuw. Werk je betaalgegevens bij in de Mollie-omgeving via de mail
          die je hebt ontvangen.
        </div>
      )}

      {isActive && (
        <div className="mt-6 border-t border-[color:var(--border-soft)] pt-5">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-xs font-semibold text-[color:var(--text-muted)] underline hover:text-[color:var(--red)]"
            >
              Abonnement opzeggen
            </button>
          ) : (
            <div className="rounded-lg bg-[color:var(--surface-2)] p-4">
              <div className="text-sm font-semibold">
                Weet je zeker dat je wil opzeggen?
              </div>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Je licentie blijft actief tot{" "}
                <span className="font-semibold">
                  {formatDate(subscription.nextBillingAt)}
                </span>
                . Daarna stopt de toegang. Je kunt later opnieuw een abonnement
                afsluiten.
              </p>
              {error && (
                <div className="mt-2 text-xs" style={{ color: "var(--red)" }}>
                  {error}
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="rounded-md border border-[color:var(--red)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ color: "var(--red)" }}
                >
                  {isPending ? "Opzeggen…" : "Ja, opzeggen"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setError(null);
                  }}
                  disabled={isPending}
                  className="text-xs font-semibold text-[color:var(--text-muted)]"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {subscription.status === "canceled" && (
        <div className="mt-6 border-t border-[color:var(--border-soft)] pt-5">
          <Link
            href="/prijzen"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--navy)] hover:underline"
          >
            <CreditCard className="size-3.5" />
            Opnieuw abonneren
          </Link>
        </div>
      )}
    </div>
  );
}
