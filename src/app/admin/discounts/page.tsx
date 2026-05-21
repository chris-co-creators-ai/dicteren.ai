import { Plus } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { listDiscounts } from "@/lib/services/commerce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kortingen · Admin" };

const KIND_LABEL = {
  percentage: "Percentage",
  fixed: "Vast bedrag",
  free_months: "Gratis periode",
} as const;

const APPLIES_LABEL = {
  consumer: "Particulier",
  organization: "Zakelijk",
} as const;

function formatValue(type: keyof typeof KIND_LABEL, value: number): string {
  if (type === "percentage") return `${value}%`;
  if (type === "fixed") return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value / 100);
  return `${value} mnd`;
}

function formatDate(d: Date | null): string {
  if (!d) return "Onbeperkt";
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusFor(d: { isActive: boolean; validUntil: Date | null }): {
  label: string;
  chip: string;
  dot: string;
} {
  if (!d.isActive)
    return { label: "Gepauzeerd", chip: "chip-orange", dot: "var(--orange)" };
  if (d.validUntil && d.validUntil < new Date())
    return { label: "Verlopen", chip: "chip-navy", dot: "var(--navy-300)" };
  return { label: "Actief", chip: "chip-green", dot: "var(--green)" };
}

export default async function AdminDiscountsPage() {
  const discounts = await listDiscounts();
  const active = discounts.filter((d) => statusFor(d).label === "Actief").length;
  const expired = discounts.filter((d) => statusFor(d).label === "Verlopen").length;
  const redemptions = discounts.reduce((s, d) => s + d.redemptionCount, 0);

  const kpis = [
    { label: "Actieve codes", value: String(active), detail: `${expired} verlopen` },
    {
      label: "Inlossingen",
      value: String(redemptions),
      detail: discounts.length ? `${discounts.length} codes totaal` : "Nog geen codes",
    },
    {
      label: "Met limiet",
      value: String(discounts.filter((d) => d.maxRedemptions !== null).length),
      detail: "Max-redemption ingesteld",
    },
    {
      label: "Onbeperkt",
      value: String(discounts.filter((d) => d.maxRedemptions === null).length),
      detail: "Geen limiet",
    },
  ];

  return (
    <>
      <AdminTopbar
        actions={
          <button className="btn btn-primary btn-sm">
            <Plus className="size-3" strokeWidth={2.4} />
            Code aanmaken
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">Kortingen</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live data uit `discount_codes`. Inlossingen worden geteld bij checkout.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{k.value}</div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {k.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="brand-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-[color:var(--text-muted)]" style={{ background: "var(--bg)" }}>
                  {["Code", "Type", "Waarde", "Geldt voor", "Inlossingen", "Status", "Verloopt"].map((h) => (
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
                {discounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]">
                      Nog geen kortingscodes.
                    </td>
                  </tr>
                ) : (
                  discounts.map((d) => {
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
                        <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                          {d.redemptionCount} / {d.maxRedemptions ?? "∞"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`chip ${m.chip} gap-1.5 px-2 py-0.5 text-[0.625rem]`}>
                            <span
                              aria-hidden
                              className="inline-block size-1.5 rounded-full"
                              style={{ background: m.dot }}
                            />
                            {m.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {formatDate(d.validUntil)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
