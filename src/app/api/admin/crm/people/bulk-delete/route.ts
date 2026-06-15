// Dicteren.ai — Admin: bulk-verwijderen van leads/prospects uit de Personen-tab.
// ADMIN-ONLY (account-managers mogen niet verwijderen). Verwerkt beide rij-soorten:
// prospects (crm_contacts) en klant-accounts (auth.user). (Ex-)betalende klanten
// worden server-side overgeslagen — zie bulkDeleteCrmPeople.
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { bulkDeleteCrmPeople } from "@/lib/services/crmDeals";

export async function POST(request: Request) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;
  const { session } = guard;

  let body: { crmContactIds?: unknown; userIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige JSON" }, { status: 400 });
  }

  const asIds = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const crmContactIds = asIds(body.crmContactIds);
  const userIds = asIds(body.userIds);

  if (crmContactIds.length === 0 && userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "Geen rijen geselecteerd" },
      { status: 400 },
    );
  }

  const result = await bulkDeleteCrmPeople({
    crmContactIds,
    userIds,
    actorUserId: session.user.id,
  });
  return NextResponse.json({ success: true, data: result });
}
