import { Plus, Users } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { listDiscounts } from "@/lib/services/commerce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliates · Admin" };

export default async function AdminAffiliatesPage() {
  // Affiliate-id wordt nu opgeslagen via discount_codes.affiliate_id. Tot we een
  // eigen affiliates-tabel hebben (Slice n+1), groeperen we redemption-tellers
  // per affiliate_id en tonen we dat als affiliate-overzicht.
  const codes = await listDiscounts();
  const grouped = new Map<
    string,
    { codes: string[]; redemptions: number }
  >();
  for (const c of codes) {
    // Use code-prefix or skip if no link. Until affiliates table exists we
    // group by code-prefix before first dash (e.g. KLICK-LAUNCH → KLICK).
    const key = c.code.includes("-") ? c.code.split("-")[0] : c.code;
    const entry = grouped.get(key) ?? { codes: [], redemptions: 0 };
    entry.codes.push(c.code);
    entry.redemptions += c.redemptionCount;
    grouped.set(key, entry);
  }

  const partners = [...grouped.entries()].map(([key, v]) => ({
    slug: key.toLowerCase(),
    name: key,
    codes: v.codes,
    redemptions: v.redemptions,
  }));

  const kpis = [
    {
      label: "Partners",
      value: String(partners.length),
      detail: partners.length
        ? "Afgeleid uit code-prefix"
        : "Nog geen aangemaakt",
    },
    {
      label: "Totaal inlossingen",
      value: String(partners.reduce((s, p) => s + p.redemptions, 0)),
      detail: "Sinds launch",
    },
    {
      label: "Codes totaal",
      value: String(codes.length),
      detail: "In discount_codes",
    },
    {
      label: "Tabel-status",
      value: "Discount-FK",
      detail: "Eigen affiliates-tabel volgt",
    },
  ];

  return (
    <>
      <AdminTopbar
        actions={
          <button className="btn btn-primary btn-sm">
            <Plus className="size-3" strokeWidth={2.4} />
            Partner toevoegen
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Affiliates
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live afleiding uit `discount_codes`. Eigen affiliates-tabel met
            uitbetalingen volgt in een latere slice.
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

        {partners.length === 0 ? (
          <div className="brand-card flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Users className="size-8" strokeWidth={1.6} style={{ color: "var(--text-soft)" }} />
            <h3 className="text-base font-bold">Nog geen affiliates</h3>
            <p className="max-w-md text-sm text-[color:var(--text-muted)]">
              Maak een kortingscode aan en koppel die aan een partner. Inlossingen
              worden hier zichtbaar zodra een code wordt gebruikt.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {partners.map((a) => (
              <div key={a.slug} className="brand-card p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-2xl"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    <Users className="size-5" strokeWidth={1.8} style={{ color: "var(--navy)" }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{a.name}</h3>
                    <code className="mt-1 inline-block font-mono text-[0.625rem] text-[color:var(--navy-500)]">
                      dicteren.ai/?ref={a.slug}
                    </code>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.codes.slice(0, 4).map((c) => (
                        <code
                          key={c}
                          className="font-mono text-[0.625rem] rounded bg-[color:var(--bg-deep)] px-1.5 py-0.5 text-[color:var(--navy)]"
                        >
                          {c}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2.5" style={{ background: "var(--bg)" }}>
                    <div className="text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
                      Codes
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold">{a.codes.length}</div>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: "var(--bg)" }}>
                    <div className="text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
                      Inlossingen
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold">{a.redemptions}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
