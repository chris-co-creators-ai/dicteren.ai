import Link from "next/link";
import { CheckCircle2, Download } from "lucide-react";
import { formatMollieAmount } from "@/lib/services/mollie";

// Bevestiging na een geslaagde checkout, getoond bovenaan /account/licenses
// (de eigen omgeving). Vervangt de losse /checkout/success-pagina voor de
// consumer-flow: de klant landt direct in z'n dashboard met de licentie in de
// lijst hieronder. Pending-afhandeling: de Mollie-webhook kan de order pas op
// `paid` zetten nadat de klant al terug is. Zolang pending: meta-refresh, dan
// verschijnt de licentie vanzelf in de lijst.
export function PurchaseBanner({
  order,
  plan,
  buyerEmail,
}: {
  order: { status: string; amountCents: number; currency: string };
  plan: { label: string } | null;
  buyerEmail: string | null;
}) {
  const isPending = order.status !== "paid";

  return (
    <div
      className="mb-6 rounded-2xl border p-5"
      style={{
        borderColor: "var(--border-soft)",
        background: "var(--bg)",
      }}
    >
      {isPending && <meta httpEquiv="refresh" content="3" />}
      <div
        className="inline-flex items-center gap-2"
        style={{ color: isPending ? "var(--orange)" : "var(--green)" }}
      >
        <CheckCircle2 className="size-5" strokeWidth={2} />
        <span className="text-xs font-bold uppercase tracking-[0.05em]">
          {isPending ? "Betaling in behandeling" : "Betaling ontvangen"}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-bold tracking-tight text-[color:var(--navy)]">
        {isPending
          ? "We wachten op bevestiging van je bank…"
          : "Welkom bij Dicteren.ai"}
      </h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        {isPending
          ? "Zodra je betaling bevestigd is, verschijnt je licentie hieronder. Dit duurt meestal minder dan een minuut."
          : `Je nieuwe licentie staat hieronder${
              plan?.label ? ` (${plan.label})` : ""
            }. We hebben 'm ook gemaild${
              buyerEmail ? ` naar ${buyerEmail}` : ""
            }.`}
      </p>

      {!isPending && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/download" className="btn btn-primary">
            <Download className="size-3.5" strokeWidth={2.2} />
            Download de app
          </Link>
          <span className="text-xs text-[color:var(--text-soft)]">
            {formatMollieAmount(order.amountCents, order.currency)} betaald
          </span>
        </div>
      )}
    </div>
  );
}
