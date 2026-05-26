import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listManageableOrganizations } from "@/lib/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn organisatie · Dicteren.ai" };

export default async function OrganizationIndexPage() {
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

  // Eén of meer manageable orgs: routeer naar de eerste. /[id] heeft een
  // switcher als er meerdere zijn zodat de gebruiker tussen orgs kan wisselen.
  redirect(`/account/organization/${manageable[0]!.id}`);
}
