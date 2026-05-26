import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db, dbAuth } from "@/lib/db";
import { authInvitation, authOrg, authUser } from "@/lib/db/auth-schema";
import { licenses } from "@/lib/db/schema";
import { AcceptInvitationCard } from "./accept-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Uitnodiging accepteren · Dicteren.ai" };

type Params = Promise<{ id: string }>;

export default async function AcceptInvitationPage({
  params,
}: {
  params: Params;
}) {
  const { id: invitationId } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(
      `/auth/sign-up?next=${encodeURIComponent(
        `/auth/accept-invitation/${invitationId}`,
      )}`,
    );
  }

  const [row] = await dbAuth
    .select({
      id: authInvitation.id,
      email: authInvitation.email,
      role: authInvitation.role,
      status: authInvitation.status,
      expiresAt: authInvitation.expiresAt,
      organizationId: authInvitation.organizationId,
      organizationName: authOrg.name,
      inviterName: authUser.name,
      inviterEmail: authUser.email,
    })
    .from(authInvitation)
    .innerJoin(authOrg, eq(authOrg.id, authInvitation.organizationId))
    .innerJoin(authUser, eq(authUser.id, authInvitation.inviterId))
    .where(eq(authInvitation.id, invitationId))
    .limit(1);

  if (!row) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Uitnodiging niet gevonden</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          De link is ongeldig of de uitnodiging is al ingetrokken.
        </p>
      </Shell>
    );
  }

  if (row.status !== "pending") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Uitnodiging is niet meer geldig</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Status: <strong>{row.status}</strong>. Vraag een nieuwe uitnodiging
          aan bij de eigenaar van de organisatie.
        </p>
      </Shell>
    );
  }

  if (row.expiresAt.getTime() < Date.now()) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Uitnodiging verlopen</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Deze uitnodiging is verlopen op{" "}
          {row.expiresAt.toLocaleDateString("nl-NL")}. Vraag de eigenaar je
          opnieuw uit te nodigen.
        </p>
      </Shell>
    );
  }

  if (row.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Andere email vereist</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Deze uitnodiging is voor <strong>{row.email}</strong>. Je bent
          ingelogd als {session.user.email}. Log uit en maak een account aan
          met het juiste adres.
        </p>
      </Shell>
    );
  }

  // Lookup gekoppelde seat-code (per-seat model)
  const [seat] = await db
    .select({ code: licenses.code })
    .from(licenses)
    .where(eq(licenses.invitationId, row.id))
    .limit(1);

  return (
    <Shell>
      <span className="chip chip-navy">Uitnodiging</span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Word lid van {row.organizationName}
      </h1>
      <p className="mt-3 text-base text-[color:var(--text-muted)]">
        {row.inviterName || row.inviterEmail} nodigt je uit om mee te doen als{" "}
        <strong>{row.role ?? "member"}</strong> in {row.organizationName}.
      </p>

      {seat?.code && (
        <div
          className="mt-6 rounded-2xl border p-5"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-soft)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            Je krijgt deze persoonlijke teamlicentie
          </p>
          <p
            className="mt-2 font-mono text-lg font-bold tracking-wider text-[color:var(--navy)]"
            style={{ letterSpacing: "0.06em" }}
          >
            {seat.code}
          </p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Werkt op maximaal 2 apparaten.
          </p>
        </div>
      )}

      <AcceptInvitationCard invitationId={row.id} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}
