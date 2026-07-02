import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Download, Mail } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getCheckoutReceipt } from "@/lib/services/order";
import { formatMollieAmount } from "@/lib/services/mollie";
import { CopyButtonClient } from "./copy-button-client";
import { ConversionPing } from "@/components/analytics/ConversionPing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bedankt voor je aankoop" };

type SearchParams = Promise<{ order?: string }>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { order: orderId } = await searchParams;
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");

  if (!orderId) {
    return (
      <SuccessShell>
        <h1 className="text-3xl font-bold tracking-tight">
          Bedankt voor je aankoop
        </h1>
        <p className="mt-3 text-base text-[color:var(--text-muted)]">
          We hebben je betaling ontvangen. Je licentie staat zo in je mailbox.
        </p>
      </SuccessShell>
    );
  }

  const receipt = await getCheckoutReceipt(orderId, session.user.id);
  if (!receipt) redirect("/");

  const { order, plan, license, buyer } = receipt;
  const isPending = order.status !== "paid";

  return (
    <SuccessShell>
      {/*
        Mollie webhook kan de order pas op `paid` zetten nadat de client al
        op deze page is. Polling-light: vernieuw elke 3 sec zolang we nog
        wachten. Zodra de webhook door is rendert er geen meta-refresh meer
        en stopt het. Geen client JS nodig.
      */}
      {isPending && <meta httpEquiv="refresh" content="3" />}
      {/* Google Ads "Abonnement gekocht" — pas als de webhook de order op paid
          heeft gezet; order-id als transaction_id dedupliceert een refresh. */}
      {!isPending && (
        <ConversionPing
          type="purchase"
          valueEur={order.amountCents / 100}
          currency={order.currency}
          transactionId={order.id}
        />
      )}
      <div className="mb-6 inline-flex items-center gap-2 text-[color:var(--green)]">
        <CheckCircle2 className="size-7" strokeWidth={2} />
        <span className="text-sm font-bold uppercase tracking-[0.05em]">
          {isPending ? "Betaling in behandeling" : "Betaling ontvangen"}
        </span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {isPending
          ? "We wachten op bevestiging van je bank…"
          : "Welkom bij Dicteren.ai"}
      </h1>
      <p className="mt-3 text-base text-[color:var(--text-muted)]">
        {isPending
          ? "Zodra je betaling bevestigd is, ontvang je je licentiecode per e-mail. Dit duurt meestal minder dan een minuut."
          : `Je licentie staat hieronder. We hebben hem ook gemaild naar ${buyer?.email}.`}
      </p>

      {license && (
        <div className="mt-7 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Je licentiecode
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code
              className="font-mono text-xl font-bold tracking-tight"
              style={{ color: "var(--navy)" }}
            >
              {license.code}
            </code>
            <CopyButtonClient value={license.code} />
          </div>
          <div className="mt-3 text-xs text-[color:var(--text-muted)]">
            Geldig tot{" "}
            {license.expiresAt
              ? new Date(license.expiresAt).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}{" "}
            · {license.seats} {license.seats === 1 ? "gebruiker" : "gebruikers"}{" "}
            · {license.maxActivationsPerSeat} apparaten per gebruiker
          </div>
        </div>
      )}

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4">
          <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
            Order
          </div>
          <div className="mt-1 font-mono text-sm">{order.id.slice(0, 8)}…</div>
          <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-soft)]">
            {plan?.label}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4">
          <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
            Bedrag
          </div>
          <div className="mt-1 font-mono text-sm font-semibold">
            {formatMollieAmount(order.amountCents, order.currency)}
          </div>
          <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-soft)]">
            {order.status === "paid" ? "Betaald" : "In behandeling"}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/download" className="btn btn-primary">
          <Download className="size-3.5" strokeWidth={2.2} />
          Download de app
        </Link>
        <a
          href={`mailto:${buyer?.email}`}
          className="btn btn-secondary"
        >
          <Mail className="size-3.5" strokeWidth={2.2} />
          Mail naar mij sturen
        </a>
      </div>

      <p className="mt-8 text-xs text-[color:var(--text-soft)]">
        Vragen? Mail{" "}
        <a
          href="mailto:info@dicteren.ai"
          className="underline hover:text-[color:var(--navy)]"
        >
          info@dicteren.ai
        </a>
        .
      </p>
    </SuccessShell>
  );
}

function SuccessShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-xl">
        <Link
          href="/"
          className="mb-6 inline-flex text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
        >
          ← Terug naar de site
        </Link>
        {children}
      </div>
    </main>
  );
}
