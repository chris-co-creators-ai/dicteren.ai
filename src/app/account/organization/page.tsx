import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  listManageableOrganizations,
  listOrganizationMembers,
  listOrganizationInvitations,
  listOrganizationLicenses,
  getOrganizationBilling,
} from "@/lib/services";
import { OrganizationManager } from "./organization-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn organisatie · Dicteren.ai" };

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?next=/account/organization");

  const manageable = await listManageableOrganizations(session.user.id);

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

  // TODO(slice-multi-org): bij meerdere manageable orgs routen naar
  // /account/organization/[id]. Tot dat dynamic-route bestaat tonen we
  // de eerste manageable org (gedrag identiek aan vorige iteratie).
  const org = manageable[0]!;

  const [members, pendingInvites, billing, teamLicenses] = await Promise.all([
    listOrganizationMembers(org.id),
    listOrganizationInvitations(org.id),
    getOrganizationBilling(org.id),
    listOrganizationLicenses(org.id),
  ]);

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
          since: m.memberSince.toISOString(),
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
