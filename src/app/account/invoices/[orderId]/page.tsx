import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getUserInvoice, INVOICE_SELLER } from "@/lib/services/commerce";
import { PrintInvoiceButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Factuur · Dicteren.ai" };

function eur(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function dateNL(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) notFound();
  const { orderId } = await params;
  const inv = await getUserInvoice(orderId, session.user.id);
  if (!inv) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/account/billing"
          className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
        >
          ← Terug naar facturering
        </Link>
        <PrintInvoiceButton />
      </div>

      <article className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-8 print:border-0 print:p-0">
        {/* Kop */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight text-[color:var(--navy)]">
              {INVOICE_SELLER.name}
            </div>
            <div className="mt-1 text-sm text-[color:var(--text-muted)]">
              {INVOICE_SELLER.website} · {INVOICE_SELLER.email}
            </div>
            {(INVOICE_SELLER.kvk || INVOICE_SELLER.vat) && (
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                {INVOICE_SELLER.kvk && <>KvK {INVOICE_SELLER.kvk}</>}
                {INVOICE_SELLER.kvk && INVOICE_SELLER.vat && " · "}
                {INVOICE_SELLER.vat && <>BTW {INVOICE_SELLER.vat}</>}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">Factuur</div>
            <div className="mt-1 text-sm text-[color:var(--text-muted)]">
              {inv.number}
            </div>
            <div className="text-sm text-[color:var(--text-muted)]">
              {dateNL(inv.issuedAt)}
            </div>
            <div className="mt-2 inline-flex rounded-full bg-[color:color-mix(in_srgb,var(--green)_14%,white)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--green)]">
              Voldaan
            </div>
          </div>
        </div>

        {/* Aan */}
        <div className="mt-8 text-sm">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Factuur aan
          </div>
          {inv.org ? (
            <div className="mt-1">
              <div className="font-semibold">{inv.org.name}</div>
              <div>{inv.buyerName}</div>
              {inv.org.addressLine1 && <div>{inv.org.addressLine1}</div>}
              {inv.org.addressLine2 && <div>{inv.org.addressLine2}</div>}
              {(inv.org.postalCode || inv.org.city) && (
                <div>
                  {inv.org.postalCode} {inv.org.city}
                </div>
              )}
              {inv.org.vatNumber && <div>BTW: {inv.org.vatNumber}</div>}
              {inv.buyerEmail && (
                <div className="text-[color:var(--text-muted)]">{inv.buyerEmail}</div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              <div className="font-semibold">{inv.buyerName}</div>
              {inv.buyerEmail && (
                <div className="text-[color:var(--text-muted)]">{inv.buyerEmail}</div>
              )}
            </div>
          )}
        </div>

        {/* Regels */}
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border-soft)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
              <th className="py-2">Omschrijving</th>
              <th className="py-2 text-center">Aantal</th>
              <th className="py-2 text-right">Per stuk (excl.)</th>
              <th className="py-2 text-right">Bedrag (excl.)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[color:var(--border-soft)]">
              <td className="py-3">{inv.lineDescription}</td>
              <td className="py-3 text-center">{inv.quantity}</td>
              <td className="py-3 text-right">{eur(inv.unitNetCents, inv.currency)}</td>
              <td className="py-3 text-right">{eur(inv.netCents, inv.currency)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totalen */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">Subtotaal excl. btw</span>
              <span>{eur(inv.netCents, inv.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">Btw 21%</span>
              <span>{eur(inv.vatCents, inv.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-[color:var(--border-soft)] pt-2 text-base font-bold">
              <span>Totaal incl. btw</span>
              <span>{eur(inv.totalCents, inv.currency)}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-[color:var(--text-muted)]">
          Dit bedrag is betaald. Factuurnummer {inv.number} · ordernummer {inv.orderId}.
        </p>
      </article>
    </main>
  );
}
