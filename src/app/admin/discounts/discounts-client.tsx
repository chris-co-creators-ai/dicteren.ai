"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";

type DiscountRow = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_months";
  value: number;
  appliesTo: "consumer" | "organization" | null;
  redemptionCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  affiliateId: string | null;
  affiliateName: string | null;
};

type AffiliateOption = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  discounts: DiscountRow[];
  affiliates: AffiliateOption[];
};

const KIND_LABEL = {
  percentage: "Percentage",
  fixed: "Vast bedrag",
  free_months: "Gratis periode",
} as const;

const APPLIES_LABEL = {
  consumer: "Particulier",
  organization: "Zakelijk",
} as const;

function formatValue(
  type: keyof typeof KIND_LABEL,
  value: number,
): string {
  if (type === "percentage") return `${value}%`;
  if (type === "fixed")
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(value / 100);
  return `${value} mnd`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Onbeperkt";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusFor(d: DiscountRow): {
  label: string;
  chip: string;
} {
  if (!d.isActive) return { label: "Gepauzeerd", chip: "chip-orange" };
  if (d.validUntil && new Date(d.validUntil) < new Date())
    return { label: "Verlopen", chip: "chip-navy" };
  return { label: "Actief", chip: "chip-green" };
}

export function DiscountsClient({ discounts, affiliates }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return discounts.filter((d) => {
      if (scopeFilter === "affiliate" && !d.affiliateId) return false;
      if (scopeFilter === "general" && d.affiliateId) return false;
      if (affiliateFilter !== "all" && d.affiliateId !== affiliateFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.code.toLowerCase().includes(q) ||
          (d.affiliateName?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [discounts, scopeFilter, affiliateFilter, search]);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/discount-codes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
            strokeWidth={2.2}
            style={{ color: "var(--text-soft)" }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek code of partner…"
            className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
            style={{ background: "var(--bg)" }}
          />
        </div>
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="rounded-lg border border-[color:var(--border-soft)] py-2 px-3 text-sm outline-none"
          style={{ background: "var(--bg)" }}
        >
          <option value="all">Alle codes</option>
          <option value="affiliate">Alleen affiliate-codes</option>
          <option value="general">Alleen algemene codes</option>
        </select>
        <select
          value={affiliateFilter}
          onChange={(e) => setAffiliateFilter(e.target.value)}
          className="rounded-lg border border-[color:var(--border-soft)] py-2 px-3 text-sm outline-none"
          style={{ background: "var(--bg)" }}
        >
          <option value="all">Alle affiliates</option>
          {affiliates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.code})
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary sm:ml-auto"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          Code aanmaken
        </button>
      </div>

      <div className="brand-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr
                className="text-[color:var(--text-muted)]"
                style={{ background: "var(--bg)" }}
              >
                {[
                  "Code",
                  "Type",
                  "Waarde",
                  "Geldt voor",
                  "Affiliate",
                  "Inlossingen",
                  "Status",
                  "Verloopt",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                  >
                    {discounts.length === 0
                      ? "Nog geen kortingscodes."
                      : "Geen codes in dit filter."}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const m = statusFor(d);
                  return (
                    <tr
                      key={d.id}
                      className="bg-white"
                      style={{ borderTop: "1px solid var(--border-soft)" }}
                    >
                      <td className="px-3 py-3">
                        <code className="font-mono text-xs font-semibold text-[color:var(--navy)]">
                          {d.code}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                        {KIND_LABEL[d.type]}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold">
                        {formatValue(d.type, d.value)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                        {d.appliesTo ? APPLIES_LABEL[d.appliesTo] : "Alle"}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {d.affiliateId ? (
                          <Link
                            href={`/admin/affiliates/${d.affiliateId}`}
                            className="font-semibold text-[color:var(--navy)] hover:underline"
                          >
                            {d.affiliateName ?? d.affiliateId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-[color:var(--text-soft)]">
                            algemeen
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                        {d.redemptionCount} / {d.maxRedemptions ?? "∞"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`chip ${m.chip} gap-1.5 px-2 py-0.5 text-[0.625rem]`}
                        >
                          {m.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                        {formatDate(d.validUntil)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => toggleActive(d.id, d.isActive)}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {d.isActive ? "Deactiveer" : "Activeer"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateDiscountModal
          affiliates={affiliates}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

function CreateDiscountModal({
  affiliates,
  onClose,
  onCreated,
}: {
  affiliates: AffiliateOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed" | "free_months">(
    "percentage",
  );
  const [value, setValue] = useState(10);
  const [appliesTo, setAppliesTo] = useState<
    "consumer" | "organization" | "all"
  >("all");
  const [minimumSeats, setMinimumSeats] = useState(0);
  const [maxRedemptions, setMaxRedemptions] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [affiliateId, setAffiliateId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        type,
        value,
        appliesTo: appliesTo === "all" ? null : appliesTo,
        minimumSeats: minimumSeats > 0 ? minimumSeats : null,
        maxRedemptions: maxRedemptions > 0 ? maxRedemptions : null,
        validUntil: validUntil || null,
      };
      if (affiliateId) {
        payload.affiliateId = affiliateId;
        if (code.trim()) payload.code = code.trim();
      } else {
        payload.code = code.trim();
      }
      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmaken mislukt.");
        setSubmitting(false);
        return;
      }
      setCreatedCode(data.discount.code);
      setSubmitting(false);
    } catch {
      setError("Netwerkprobleem — probeer opnieuw.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-xl font-bold">Nieuwe discount-code</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Algemeen of gekoppeld aan een affiliate. Bij affiliate-koppeling:
          klant wordt lifetime toegewezen aan die reseller bij gebruik.
        </p>

        {createdCode ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-semibold uppercase text-green-800">
              Code aangemaakt
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-green-900">
              {createdCode}
            </div>
            <div className="mt-3 break-all rounded-md bg-white p-3 font-mono text-xs">
              https://www.dicteren.ai/zakelijk/start?code={createdCode}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={onCreated} className="btn btn-primary">
                Sluiten en lijst verversen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Koppel aan affiliate (optioneel)">
              <select
                value={affiliateId}
                onChange={(e) => setAffiliateId(e.target.value)}
                className="input"
              >
                <option value="">Geen — algemene code</option>
                {affiliates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Code ${affiliateId ? "(optioneel, auto-prefix)" : "(verplicht)"}`}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input font-mono"
                placeholder={
                  affiliateId ? "Leeg = auto" : "bv. LAUNCH2026"
                }
                required={!affiliateId}
              />
            </Field>
            <Field label="Type" required>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "percentage" | "fixed" | "free_months")
                }
                className="input"
              >
                <option value="percentage">% korting</option>
                <option value="fixed">Vast bedrag (cents)</option>
                <option value="free_months">Maanden gratis</option>
              </select>
            </Field>
            <Field label="Waarde" required>
              <input
                type="number"
                min={0}
                required
                value={value}
                onChange={(e) => setValue(Number(e.target.value) || 0)}
                className="input"
              />
              <span className="text-[0.6875rem] text-muted-foreground">
                {type === "percentage"
                  ? "0-100"
                  : type === "fixed"
                    ? "cents"
                    : "maanden"}
              </span>
            </Field>
            <Field label="Doelgroep">
              <select
                value={appliesTo}
                onChange={(e) =>
                  setAppliesTo(
                    e.target.value as "consumer" | "organization" | "all",
                  )
                }
                className="input"
              >
                <option value="all">Alle</option>
                <option value="organization">Zakelijk</option>
                <option value="consumer">Consumer</option>
              </select>
            </Field>
            <Field label="Min. seats">
              <input
                type="number"
                min={0}
                value={minimumSeats}
                onChange={(e) => setMinimumSeats(Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Max. gebruik (0 = ∞)">
              <input
                type="number"
                min={0}
                value={maxRedemptions}
                onChange={(e) =>
                  setMaxRedemptions(Number(e.target.value) || 0)
                }
                className="input"
              />
            </Field>
            <Field label="Geldig tot">
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input"
              />
            </Field>

            {error && (
              <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Aanmaken…" : "Code aanmaken"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold">
        {label}{" "}
        {required && <span className="text-[color:var(--orange)]">*</span>}
      </span>
      {children}
    </label>
  );
}
