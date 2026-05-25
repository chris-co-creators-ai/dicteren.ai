"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

type Member = {
  memberId: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  since: string;
};

type Invite = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string;
};

type Props = {
  organizationId: string;
  canInvite: boolean;
  members: Member[];
  pendingInvites: Invite[];
  currentUserId: string;
};

export function OrganizationManager({
  organizationId,
  canInvite,
  members,
  pendingInvites,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!inviteEmail.trim()) return;
    const result = await authClient.organization.inviteMember({
      email: inviteEmail.trim(),
      role: inviteRole,
      organizationId,
    });
    if (result.error) {
      setError(result.error.message ?? "Uitnodigen mislukt.");
      return;
    }
    setInviteEmail("");
    setInfo(`Uitnodiging verstuurd naar ${inviteEmail.trim()}.`);
    startTransition(() => router.refresh());
  }

  async function cancelInvite(invitationId: string) {
    setError(null);
    setInfo(null);
    const result = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (result.error) {
      setError(result.error.message ?? "Annuleren mislukt.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function removeMember(memberId: string) {
    if (!confirm("Dit lid verwijderen uit de organisatie?")) return;
    setError(null);
    setInfo(null);
    const result = await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId,
    });
    if (result.error) {
      setError(result.error.message ?? "Verwijderen mislukt.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-8 grid gap-8">
      <section>
        <h2 className="text-lg font-bold">Leden ({members.length})</h2>
        <ul className="mt-3 divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)] bg-white">
          {members.map((m) => (
            <li
              key={m.memberId}
              className="flex items-center justify-between p-4"
            >
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {m.email} · {m.role}
                </div>
              </div>
              {canInvite && m.userId !== currentUserId && m.role !== "owner" && (
                <button
                  onClick={() => removeMember(m.memberId)}
                  className="text-xs font-semibold text-red-700 hover:underline"
                  disabled={pending}
                >
                  Verwijderen
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {pendingInvites.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">
            Openstaande uitnodigingen ({pendingInvites.length})
          </h2>
          <ul className="mt-3 divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)] bg-white">
            {pendingInvites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <div className="font-medium">{i.email}</div>
                  <div className="text-xs text-[color:var(--text-muted)]">
                    Rol: {i.role ?? "member"} · verloopt{" "}
                    {new Date(i.expiresAt).toLocaleDateString("nl-NL")}
                  </div>
                </div>
                {canInvite && (
                  <button
                    onClick={() => cancelInvite(i.id)}
                    className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)] hover:underline"
                    disabled={pending}
                  >
                    Annuleren
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canInvite && (
        <section>
          <h2 className="text-lg font-bold">Lid uitnodigen</h2>
          <form
            onSubmit={sendInvite}
            className="mt-3 grid gap-3 rounded-xl border border-[color:var(--border-soft)] bg-white p-4 sm:grid-cols-[1fr_140px_auto]"
          >
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              className="input"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "member" | "admin")
              }
              className="input"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary disabled:opacity-50"
            >
              Verstuur
            </button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-red-700">{error}</p>
          )}
          {info && (
            <p className="mt-2 text-sm text-[color:var(--green)]">{info}</p>
          )}
        </section>
      )}
    </div>
  );
}
