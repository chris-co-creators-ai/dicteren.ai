import "server-only";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema";
import type { CrmOrganization } from "@/lib/db/schema";

// Dicteren.ai — FSM-gates op de org-pipeline. "Make illegal states
// unrepresentable": een org kan niet vooruit zonder de verplichte velden.
// Server-side afgedwongen (dekt side-panel én kanban-drag). Achteruit of naar
// 'lost' mag altijd.

export const STAGE_RANK: Record<string, number> = {
  lead: 0,
  contacted: 1,
  qualified: 2,
  proposal_sent: 3,
  negotiating: 4,
  won: 5,
  lost: -1,
  // Reseller-traject: parallel spoor zonder extra verplichte velden.
  reseller: 1,
};

export type GateField = { key: string; label: string };

// Velden die bij hét bereiken van een stage verplicht worden (cumulatief op rang).
const REQUIRED_AT: Record<string, GateField[]> = {
  qualified: [
    { key: "email", label: "E-mailadres (contact)" },
    { key: "kvk", label: "KvK-nummer" },
    { key: "website", label: "Website" },
  ],
  proposal_sent: [
    { key: "province", label: "Provincie" },
    { key: "address", label: "Adres (postcode + straat)" },
  ],
  won: [
    { key: "vat", label: "BTW-nummer" },
    { key: "seats", label: "Aantal seats" },
    { key: "amount", label: "Voorgesteld bedrag" },
  ],
};

/** Alle verplichte velden t/m de doel-stage (cumulatief). */
export function requiredForStatus(target: string): GateField[] {
  const targetRank = STAGE_RANK[target] ?? 0;
  const out: GateField[] = [];
  for (const [stage, reqs] of Object.entries(REQUIRED_AT)) {
    if ((STAGE_RANK[stage] ?? 99) <= targetRank) out.push(...reqs);
  }
  return out;
}

function fieldOk(
  key: string,
  org: CrmOrganization,
  hasContactEmail: boolean,
): boolean {
  switch (key) {
    case "email":
      return hasContactEmail;
    case "kvk":
      return !!org.kvk?.trim();
    case "website":
      return !!org.website?.trim();
    case "province":
      return !!org.province?.trim();
    case "address":
      return !!org.postalCode?.trim() && !!org.addressLine1?.trim();
    case "vat":
      return !!org.vatNumber?.trim();
    case "seats":
      return (org.proposedSeats ?? 0) > 0;
    case "amount":
      return (org.proposedAmountCents ?? 0) > 0;
    default:
      return true;
  }
}

async function orgHasContactEmail(orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: crmContacts.id })
    .from(crmContacts)
    .where(
      and(
        eq(crmContacts.crmOrganizationId, orgId),
        isNotNull(crmContacts.email),
        ne(crmContacts.email, ""),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * Mag de org naar `targetStatus`? Alleen vooruit-transities worden gegate;
 * achteruit en 'lost' mogen altijd. Geeft de ontbrekende velden terug.
 */
export async function checkStageGate(
  org: CrmOrganization,
  targetStatus: string,
): Promise<{ ok: boolean; missing: GateField[] }> {
  const targetRank = STAGE_RANK[targetStatus] ?? 0;
  const currentRank = STAGE_RANK[org.status] ?? 0;
  if (targetStatus === "lost" || targetRank <= currentRank) {
    return { ok: true, missing: [] };
  }
  const reqs = requiredForStatus(targetStatus);
  const needsEmail = reqs.some((r) => r.key === "email");
  const hasEmail = needsEmail ? await orgHasContactEmail(org.id) : true;
  const missing = reqs.filter((r) => !fieldOk(r.key, org, hasEmail));
  return { ok: missing.length === 0, missing };
}
