import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db, dbAuth } from "@/lib/db";
import { authMember, authOrg, authUser, authInvitation } from "@/lib/db/auth-schema";
import { organizationBilling, licenses } from "@/lib/db/schema";
import { OrganizationManager } from "./organization-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn organisatie · Dicteren.ai" };

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?next=/account/organization");

  // Vind de orgs waar deze user owner/admin van is.
  const orgs = await dbAuth
    .select({
      id: authOrg.id,
      name: authOrg.name,
      slug: authOrg.slug,
      role: authMember.role,
    })
    .from(authMember)
    .innerJoin(authOrg, eq(authOrg.id, authMember.organizationId))
    .where(eq(authMember.userId, session.user.id));

  const manageable = orgs.filter(
    (o) => o.role === "owner" || o.role === "admin",
  );

  if (manageable.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Geen organisatie</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Je bent geen beheerder van een zakelijk account. Wil je een team
          starten? Kies een zakelijk plan op de prijzenpagina.
        </p>
        <Link href="/prijzen" className="btn btn-primary mt-6 inline-flex">
          Naar prijzen
        </Link>
      </main>
    );
  }

  // Voor MVP: toon de eerste manageable org.
  const org = manageable[0]!;

  const members = await dbAuth
    .select({
      memberId: authMember.id,
      userId: authMember.userId,
      role: authMember.role,
      name: authUser.name,
      email: authUser.email,
      since: authMember.createdAt,
    })
    .from(authMember)
    .innerJoin(authUser, eq(authUser.id, authMember.userId))
    .where(eq(authMember.organizationId, org.id))
    .orderBy(authMember.createdAt);

  const pendingInvites = await dbAuth
    .select({
      id: authInvitation.id,
      email: authInvitation.email,
      role: authInvitation.role,
      status: authInvitation.status,
      expiresAt: authInvitation.expiresAt,
    })
    .from(authInvitation)
    .where(
      and(
        eq(authInvitation.organizationId, org.id),
        eq(authInvitation.status, "pending"),
      ),
    )
    .orderBy(desc(authInvitation.expiresAt));

  const [billing] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.organizationId, org.id))
    .limit(1);

  const teamLicenses = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      status: licenses.status,
      seats: licenses.seats,
      maxActivationsPerSeat: licenses.maxActivationsPerSeat,
      expiresAt: licenses.expiresAt,
    })
    .from(licenses)
    .where(eq(licenses.organizationId, org.id))
    .orderBy(desc(licenses.issuedAt));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="chip chip-navy">Organisatie</span>
        <span className="text-xs uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Rol: {org.role}
        </span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Beheer teamleden, bekijk je licenties en wijzig je factuurgegevens.
      </p>

      <OrganizationManager
        organizationId={org.id}
        canInvite={org.role === "owner" || org.role === "admin"}
        members={members.map((m) => ({
          ...m,
          since: m.since.toISOString(),
        }))}
        pendingInvites={pendingInvites.map((i) => ({
          ...i,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        currentUserId={session.user.id}
      />

      <section className="mt-10">
        <h2 className="text-lg font-bold">Licenties</h2>
        {teamLicenses.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Nog geen team-licentie. Koop er een via{" "}
            <Link href="/prijzen" className="underline">
              /prijzen
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {teamLicenses.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4"
              >
                <div className="font-mono text-sm font-bold text-[color:var(--navy)]">
                  {l.code}
                </div>
                <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Status: {l.status} · {l.seats} seats × {l.maxActivationsPerSeat} apparaten ·{" "}
                  {l.expiresAt
                    ? `geldig tot ${new Date(l.expiresAt).toLocaleDateString("nl-NL")}`
                    : "geen vervaldatum"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {billing && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Factuurgegevens</h2>
          <dl className="mt-3 grid gap-2 rounded-xl border border-[color:var(--border-soft)] bg-white p-5 text-sm sm:grid-cols-2">
            <Row label="Factuur-email" value={billing.billingEmail} />
            <Row label="BTW-nummer" value={billing.vatNumber} />
            <Row label="Adres" value={billing.addressLine1} />
            <Row label="Adres regel 2" value={billing.addressLine2} />
            <Row label="Postcode" value={billing.postalCode} />
            <Row label="Plaats" value={billing.city} />
            <Row label="Land" value={billing.countryCode} />
            <Row label="PO-nummer" value={billing.purchaseOrderNumber} />
          </dl>
        </section>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value ?? "—"}</dd>
    </div>
  );
}
