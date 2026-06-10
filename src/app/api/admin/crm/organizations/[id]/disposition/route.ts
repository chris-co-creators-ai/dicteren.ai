// Dicteren.ai — Admin: CRM call-center dispositie verwerken.
// Logt de beluitkomst, zet (indien van toepassing) een vervolgtaak met datum en
// werkt de org-vlaggen bij. De dispositie-set leeft in crmCallDisposition.ts.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { applyDisposition } from "@/lib/services/crmDeals";
import { DISPOSITION_BY_KEY } from "@/lib/services/crmCallDisposition";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Ongeldige JSON" }, { status: 400 });
  }

  const key = String(body.dispositionKey ?? "").trim();
  if (!DISPOSITION_BY_KEY[key]) {
    return NextResponse.json(
      { success: false, error: `Onbekende dispositie: ${key || "(leeg)"}` },
      { status: 400 },
    );
  }

  const dueAtRaw = body.dueAt as string | undefined;
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;

  const result = await applyDisposition({
    orgId,
    dispositionKey: key,
    dueAt,
    actorUserId: session.user.id,
  });

  return NextResponse.json({ success: true, data: result });
}
