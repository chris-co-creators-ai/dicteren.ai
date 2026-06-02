import { Download, FileText } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { listInvoices } from "@/lib/services/commerce";
import { formatMollieAmount } from "@/lib/services/mollie";
import { assertStaffPageAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturen · Admin" };

const STATUS_META = {
  paid: { label: "Betaald", chip: "chip-green", dot: "var(--green)" },
  open: { label: "Open", chip: "chip-navy", dot: "var(--navy-300)" },
  overdue: { label: "Achterstallig", chip: "chip-red", dot: "var(--red)" },
  draft: { label: "Concept", chip: "chip-orange", dot: "var(--orange)" },
} as const;

function formatDate(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminInvoicesPage() {
  await assertStaffPageAccess("/admin/invoices");
  const invoices = await listInvoices(200);
  const month = new Date();
  month.setDate(1);
  const thisMonth = invoices.filter((i) => i.issuedAt >= month);
  const paidThisMonth = thisMonth.filter((i) => i.status === "paid");
  const open = invoices.filter((i) => i.status === "open");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const sumThisMonth = paidThisMonth.reduce((s, i) => s + i.totalCents, 0);
  const sumOpen = open.reduce((s, i) => s + i.totalCents, 0);

  const kpis = [
    {
      label: "Verstuurd deze maand",
      value: String(thisMonth.length),
      detail: `${formatMollieAmount(sumThisMonth)} betaald`,
    },
    {
      label: "Open",
      value: String(open.length),
      detail: `${formatMollieAmount(sumOpen)} openstaand`,
    },
    {
      label: "Achterstallig",
      value: String(overdue.length),
      detail: overdue.length ? "Herinnering nodig" : "Niets te innen",
    },
    {
      label: "Totaal facturen",
      value: String(invoices.length),
      detail: "Alle tijden",
    },
  ];

  return (
    <>
      <AdminTopbar
        actions={
          <button className="btn btn-secondary btn-sm">
            <Download className="size-3" strokeWidth={2.2} />
            Exporteer maand
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">Facturen</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Genereerde facturen met 21% BTW, gekoppeld aan Mollie-orders. Live uit Neon.
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
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  {[
                    "Nummer",
                    "Klant",
                    "Subtotaal",
                    "BTW",
                    "Totaal",
                    "Status",
                    "Vervaldatum",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-14 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      Nog geen facturen.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const m = STATUS_META[inv.status];
                    return (
                      <tr
                        key={inv.id}
                        className="bg-white"
                        style={{ borderTop: "1px solid var(--border-soft)" }}
                      >
                        <td className="px-3 py-3">
                          <code className="font-mono text-xs text-[color:var(--navy)]">
                            {inv.number}
                          </code>
                          <div className="text-[0.625rem] text-[color:var(--text-soft)]">
                            ord_{inv.orderId.slice(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold">{inv.customer}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                          {formatMollieAmount(inv.amountCents)}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                          {formatMollieAmount(inv.vatCents)}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold">
                          {formatMollieAmount(inv.totalCents)}
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
                          {formatDate(inv.dueAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            aria-label="Download PDF"
                            className="rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                          >
                            <FileText className="size-3.5" strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            <span>
              1–{invoices.length} van {invoices.length}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
