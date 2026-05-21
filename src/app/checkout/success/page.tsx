import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Copy, Download, Mail } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers, licenses, orders, plans } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { formatMollieAmount } from "@/lib/services/mollie";

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

  // Lookup order + plan + license + user
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderRows[0];
  if (!order || order.userId !== session.user.id) redirect("/");

  const planRow = order.planId
    ? (await db.select().from(plans).where(eq(plans.id, order.planId)).limit(1))[0]
    : null;
  const licenseRow = (
    await db.select().from(licenses).where(eq(licenses.orderId, order.id)).limit(1)
  )[0];
  const buyer = (
    await db
      .select({ email: authUsers.email, name: authUsers.name })
      .from(authUsers)
      .where(eq(authUsers.id, order.userId!))
      .limit(1)
  )[0];

  const isPending = order.status !== "paid";

  return (
    <SuccessShell>
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

      {licenseRow && (
        <div className="mt-7 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Je licentiecode
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code
              className="font-mono text-xl font-bold tracking-tight"
              style={{ color: "var(--navy)" }}
            >
              {licenseRow.code}
            </code>
            <CopyButton value={licenseRow.code} />
          </div>
          <div className="mt-3 text-xs text-[color:var(--text-muted)]">
            Geldig tot{" "}
            {licenseRow.expiresAt
              ? new Date(licenseRow.expiresAt).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}{" "}
            · {licenseRow.seats} {licenseRow.seats === 1 ? "gebruiker" : "gebruikers"}{" "}
            · {licenseRow.maxActivationsPerSeat} apparaten per gebruiker
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
            {planRow?.label}
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

function CopyButton({ value }: { value: string }) {
  return (
    <CopyButtonClient value={value} />
  );
}

import { CopyButtonClient } from "./copy-button-client";
