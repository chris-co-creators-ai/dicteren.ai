"use client";

import { useState } from "react";

type Affiliate = {
  id: string;
  code: string;
  slug: string | null;
  name: string;
  displayName: string | null;
  welcomeMessage: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  // Legacy
  commissionType: string;
  commissionPct: number;
  commissionFixedCents: number;
  // V2 consumer
  consumerCommissionType: string | null;
  consumerCommissionPct: number;
  consumerCommissionFixedCents: number;
  consumerCommissionDurationMonths: number;
  consumerRecurringCommissionPct: number;
  // V2 business
  businessCommissionType: string | null;
  businessCommissionPct: number;
  businessCommissionFixedCents: number;
  businessCommissionDurationMonths: number;
  businessRecurringCommissionPct: number;
  // Payout
  minimumPayoutCents: number;
  payoutMethod: string | null;
  internalNotes: string | null;
};

type Props = {
  affiliate: Affiliate;
  onSaved: () => void;
};

type RuleType = "off" | "percentage" | "fixed_per_seat";

export function AffiliateEditForm({ affiliate, onSaved }: Props) {
  const [name, setName] = useState(affiliate.name);
  const [slug, setSlug] = useState(affiliate.slug ?? "");
  const [displayName, setDisplayName] = useState(affiliate.displayName ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(
    affiliate.welcomeMessage ?? "",
  );
  const [brandColor, setBrandColor] = useState(affiliate.brandColor ?? "");
  const [brandLogoUrl, setBrandLogoUrl] = useState(affiliate.brandLogoUrl ?? "");
  const [contactEmail, setContactEmail] = useState(affiliate.contactEmail);
  const [contactPhone, setContactPhone] = useState(affiliate.contactPhone ?? "");
  const [status, setStatus] = useState(affiliate.status);

  // Consumer-config
  const [consumerType, setConsumerType] = useState<RuleType>(
    (affiliate.consumerCommissionType as RuleType | null) ?? "off",
  );
  const [consumerPct, setConsumerPct] = useState(
    affiliate.consumerCommissionPct,
  );
  const [consumerFixed, setConsumerFixed] = useState(
    affiliate.consumerCommissionFixedCents,
  );
  const [consumerDuration, setConsumerDuration] = useState(
    affiliate.consumerCommissionDurationMonths,
  );
  const [consumerRecurringPct, setConsumerRecurringPct] = useState(
    affiliate.consumerRecurringCommissionPct,
  );

  // Business-config
  const [businessType, setBusinessType] = useState<RuleType>(
    (affiliate.businessCommissionType as RuleType | null) ?? "off",
  );
  const [businessPct, setBusinessPct] = useState(
    affiliate.businessCommissionPct,
  );
  const [businessFixed, setBusinessFixed] = useState(
    affiliate.businessCommissionFixedCents,
  );
  const [businessDuration, setBusinessDuration] = useState(
    affiliate.businessCommissionDurationMonths,
  );
  const [businessRecurringPct, setBusinessRecurringPct] = useState(
    affiliate.businessRecurringCommissionPct,
  );

  const [minimumPayout, setMinimumPayout] = useState(
    affiliate.minimumPayoutCents,
  );
  const [payoutMethod, setPayoutMethod] = useState(
    affiliate.payoutMethod ?? "bank",
  );
  const [internalNotes, setInternalNotes] = useState(
    affiliate.internalNotes ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  async function checkSlug() {
    if (!slug.trim()) return;
    setSlugError(null);
    try {
      const res = await fetch(
        `/api/admin/affiliates/${affiliate.id}/slug-check?slug=${encodeURIComponent(slug.trim())}`,
      );
      const data = await res.json();
      if (!data.ok) {
        setSlugError(data.error ?? "Slug niet beschikbaar.");
      }
    } catch {
      setSlugError("Slug-check mislukt.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSlugError(null);

    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || null,
          displayName: displayName.trim() || null,
          welcomeMessage: welcomeMessage.trim() || null,
          brandColor: brandColor.trim() || null,
          brandLogoUrl: brandLogoUrl.trim() || null,
          contactEmail,
          contactPhone: contactPhone || null,
          status,
          // Consumer
          consumerCommissionType: consumerType === "off" ? null : consumerType,
          consumerCommissionPct:
            consumerType === "percentage" ? consumerPct : 0,
          consumerCommissionFixedCents:
            consumerType === "fixed_per_seat" ? consumerFixed : 0,
          consumerCommissionDurationMonths: consumerDuration,
          consumerRecurringCommissionPct: consumerRecurringPct,
          // Business
          businessCommissionType: businessType === "off" ? null : businessType,
          businessCommissionPct:
            businessType === "percentage" ? businessPct : 0,
          businessCommissionFixedCents:
            businessType === "fixed_per_seat" ? businessFixed : 0,
          businessCommissionDurationMonths: businessDuration,
          businessRecurringCommissionPct: businessRecurringPct,
          // Payout
          minimumPayoutCents: minimumPayout,
          payoutMethod: payoutMethod || null,
          internalNotes: internalNotes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.code === "INVALID_SLUG" || data.code === "SLUG_TAKEN") {
          setSlugError(data.error);
        } else {
          setError(data.error ?? "Opslaan mislukt.");
        }
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch {
      setError("Opslaan mislukt.");
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
        <h2 className="text-xl font-bold">Instellingen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Code <span className="font-mono">{affiliate.code}</span> kun je niet
          wijzigen. Slug, branding + commissies wel.
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-5">
          {/* Basis */}
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Naam (intern)">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Display-naam (publiek op slug-pagina)">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder={name}
              />
            </Field>
            <Field label="Contact-email">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Telefoon">
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
            <Field label="Slug (URL)">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  dicteren.ai/
                </span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase());
                    setSlugError(null);
                  }}
                  onBlur={checkSlug}
                  className="input flex-1"
                  placeholder="jan-de-vries"
                  pattern="[a-z0-9](?:[a-z0-9\-]{1,38}[a-z0-9])?"
                />
              </div>
              {slugError && (
                <span className="text-xs text-red-600">{slugError}</span>
              )}
            </Field>
          </section>

          <label className="grid gap-1">
            <span className="text-xs font-semibold">
              Welkomstbericht op slug-pagina
            </span>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="input min-h-[60px]"
              placeholder="Quote of korte intro die op de landingspagina staat."
            />
          </label>

          {/* Brandkit voor de op-maat slug-landing */}
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-semibold">Accentkleur (hex)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor || "#0A2A73"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-12 rounded border"
                  aria-label="Accentkleur"
                />
                <input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="input flex-1"
                  placeholder="#1F8A4C"
                />
              </div>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold">Logo-URL</span>
              <input
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                className="input"
                placeholder="https://…/logo.png"
              />
            </label>
          </div>

          {/* Consumer-config */}
          <section className="rounded-xl border bg-[color:var(--bg)] p-4">
            <h3 className="text-sm font-bold">Persoonlijke aankopen</h3>
            <p className="text-xs text-muted-foreground">
              Commissie wanneer een referred user een persoonlijke licentie
              koopt.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Type">
                <select
                  value={consumerType}
                  onChange={(e) => setConsumerType(e.target.value as RuleType)}
                  className="input"
                >
                  <option value="off">Uit</option>
                  <option value="percentage">% van order</option>
                  <option value="fixed_per_seat">Vast (cents)</option>
                </select>
              </Field>
              {consumerType === "percentage" && (
                <Field label="% per order">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={consumerPct}
                    onChange={(e) =>
                      setConsumerPct(Number(e.target.value) || 0)
                    }
                    className="input"
                  />
                </Field>
              )}
              {consumerType === "fixed_per_seat" && (
                <Field label="Cents per seat">
                  <input
                    type="number"
                    min={0}
                    value={consumerFixed}
                    onChange={(e) =>
                      setConsumerFixed(Number(e.target.value) || 0)
                    }
                    className="input"
                  />
                </Field>
              )}
              <Field label="Duur (maanden, 0 = lifetime)">
                <input
                  type="number"
                  min={0}
                  value={consumerDuration}
                  onChange={(e) =>
                    setConsumerDuration(Number(e.target.value) || 0)
                  }
                  className="input"
                  disabled={consumerType === "off"}
                />
              </Field>
              <Field label="Verlengings-% (over recurring)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={consumerRecurringPct}
                  onChange={(e) =>
                    setConsumerRecurringPct(Number(e.target.value) || 0)
                  }
                  className="input"
                  disabled={consumerType === "off"}
                />
              </Field>
            </div>
          </section>

          {/* Business-config */}
          <section className="rounded-xl border bg-[color:var(--bg)] p-4">
            <h3 className="text-sm font-bold">Zakelijke aankopen</h3>
            <p className="text-xs text-muted-foreground">
              Commissie wanneer een referred user een zakelijk plan koopt.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Type">
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as RuleType)}
                  className="input"
                >
                  <option value="off">Uit</option>
                  <option value="percentage">% van order</option>
                  <option value="fixed_per_seat">Vast (cents/seat)</option>
                </select>
              </Field>
              {businessType === "percentage" && (
                <Field label="% per order">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={businessPct}
                    onChange={(e) =>
                      setBusinessPct(Number(e.target.value) || 0)
                    }
                    className="input"
                  />
                </Field>
              )}
              {businessType === "fixed_per_seat" && (
                <Field label="Cents per seat">
                  <input
                    type="number"
                    min={0}
                    value={businessFixed}
                    onChange={(e) =>
                      setBusinessFixed(Number(e.target.value) || 0)
                    }
                    className="input"
                  />
                </Field>
              )}
              <Field label="Duur (maanden, 0 = lifetime)">
                <input
                  type="number"
                  min={0}
                  value={businessDuration}
                  onChange={(e) =>
                    setBusinessDuration(Number(e.target.value) || 0)
                  }
                  className="input"
                  disabled={businessType === "off"}
                />
              </Field>
              <Field label="Verlengings-% (over recurring)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={businessRecurringPct}
                  onChange={(e) =>
                    setBusinessRecurringPct(Number(e.target.value) || 0)
                  }
                  className="input"
                  disabled={businessType === "off"}
                />
              </Field>
            </div>
          </section>

          {/* Payout */}
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Minimum payout (cents)">
              <input
                type="number"
                min={0}
                value={minimumPayout}
                onChange={(e) =>
                  setMinimumPayout(Number(e.target.value) || 0)
                }
                className="input"
              />
            </Field>
            <Field label="Payout-methode">
              <input
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="input"
                placeholder="bank, paypal, ..."
              />
            </Field>
          </section>

          <label className="grid gap-1">
            <span className="text-xs font-semibold">Interne notitie</span>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="input min-h-[80px]"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary disabled:opacity-50"
            >
              {submitting ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </form>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}
