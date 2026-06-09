"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";

type Props = {
  planSlug: string;
  planLabel: string;
  listAmountCents: number;
  period: string;
};

type Method = "ideal" | "creditcard";

const PERIOD_LABEL: Record<string, string> = {
  monthly: "per maand",
  quarterly: "per kwartaal",
  yearly: "per jaar",
  lifetime: "eenmalig",
};

function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function CheckoutClient({
  planSlug,
  planLabel,
  listAmountCents,
  period,
}: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{
    payableAmountCents: number;
    discountAmountCents: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [method, setMethod] = useState<Method>("ideal");
  const [paying, setPaying] = useState(false);

  const payable = applied?.payableAmountCents ?? listAmountCents;
  const periodLabel = PERIOD_LABEL[period] ?? "";

  async function applyCode() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setValidating(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/checkout/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, planSlug }),
      });
      const json = (await res.json()) as
        | { valid: true; payableAmountCents: number; discountAmountCents: number }
        | { valid: false; error: string };
      if (!json.valid) {
        setApplied(null);
        setCouponError(json.error);
        return;
      }
      setApplied({
        payableAmountCents: json.payableAmountCents,
        discountAmountCents: json.discountAmountCents,
      });
    } catch {
      setCouponError("Kon de code nu niet controleren. Probeer het opnieuw.");
    } finally {
      setValidating(false);
    }
  }

  function clearCode() {
    setCode("");
    setApplied(null);
    setCouponError(null);
  }

  async function pay() {
    setPaying(true);
    try {
      const res = await fetch("/api/checkout/consumer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug,
          discountCode: applied ? code.trim() : undefined,
          method,
        }),
      });

      if (res.status === 401) {
        toast.error("Log eerst in om af te rekenen");
        router.push(
          `/auth/sign-in?redirect=${encodeURIComponent(
            `/checkout?plan=${planSlug}`,
          )}`,
        );
        return;
      }

      const json = (await res.json()) as
        | { success: true; checkoutUrl: string }
        | { success: false; error: string };

      if (!json.success) {
        toast.error("Kon afrekenen niet starten", { description: json.error });
        return;
      }
      window.location.href = json.checkoutUrl;
    } catch (err) {
      toast.error("Netwerkfout", { description: (err as Error).message });
    } finally {
      setPaying(false);
    }
  }

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ background: "var(--bg-deep)" }}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Logo height={28} />
          <Link
            href="/prijzen"
            className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--navy)] hover:underline"
          >
            Terug naar prijzen
          </Link>
        </div>

        <div
          className="rounded-2xl bg-white p-6 lg:p-8"
          style={{
            border: "1px solid var(--border-soft)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <h1 className="text-xl font-bold tracking-tight text-[color:var(--navy)]">
            Afrekenen
          </h1>

          {/* Plan-overzicht */}
          <div
            className="mt-5 flex items-baseline justify-between border-b pb-4"
            style={{ borderColor: "var(--border-soft)" }}
          >
            <div>
              <p className="font-semibold text-[color:var(--navy)]">
                {planLabel}
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                {periodLabel}
              </p>
            </div>
            <div className="text-right">
              {applied && applied.discountAmountCents > 0 ? (
                <>
                  <p className="text-sm text-[color:var(--text-soft)] line-through">
                    {euro(listAmountCents)}
                  </p>
                  <p className="text-lg font-bold text-[color:var(--navy)]">
                    {euro(payable)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-[color:var(--navy)]">
                  {euro(payable)}
                </p>
              )}
            </div>
          </div>

          {/* Kortingscode */}
          <div className="mt-5">
            <label
              htmlFor="discount"
              className="text-sm font-semibold text-[color:var(--navy)]"
            >
              Kortingscode
            </label>
            {applied ? (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[color:var(--bg)] px-3 py-2">
                <span className="text-sm font-medium text-[color:var(--navy)]">
                  {code.trim().toUpperCase()} toegepast ({euro(applied.discountAmountCents)} korting)
                </span>
                <button
                  type="button"
                  onClick={clearCode}
                  className="text-sm text-[color:var(--text-muted)] hover:underline"
                >
                  Verwijderen
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  id="discount"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCode();
                    }
                  }}
                  placeholder="Heb je een code?"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--navy)]"
                  style={{ borderColor: "var(--border-soft)" }}
                />
                <button
                  type="button"
                  onClick={applyCode}
                  disabled={validating || !code.trim()}
                  className="btn btn-secondary"
                >
                  {validating ? "Bezig…" : "Toepassen"}
                </button>
              </div>
            )}
            {couponError && (
              <p className="mt-2 text-sm text-[color:#c0392b]">{couponError}</p>
            )}
          </div>

          {/* Methode-keuze */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-[color:var(--navy)]">
              Betaalmethode
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "ideal", label: "iDEAL" },
                  { id: "creditcard", label: "Creditcard" },
                ] as { id: Method; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className="rounded-lg border px-4 py-3 text-sm font-semibold transition"
                  style={{
                    borderColor:
                      method === m.id
                        ? "var(--navy)"
                        : "var(--border-soft)",
                    background:
                      method === m.id ? "var(--bg)" : "transparent",
                    color: "var(--navy)",
                  }}
                  aria-pressed={method === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Afrekenen */}
          <button
            type="button"
            onClick={pay}
            disabled={paying}
            className="btn btn-primary btn-lg mt-6 w-full"
          >
            {paying ? "Bezig…" : `Betaal ${euro(payable)}`}
          </button>
          <p className="mt-3 text-center text-xs text-[color:var(--text-soft)]">
            Beveiligd via Mollie. Maandelijks opzegbaar.
          </p>
        </div>
      </div>
    </main>
  );
}
