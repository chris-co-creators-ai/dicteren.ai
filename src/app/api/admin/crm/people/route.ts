// Dicteren.ai — Gepagineerde CRM-personen-feed voor de client.
//
// Voedt het "meer laden" + filter/search-gedrag van de Personen-tab. De eerste
// pagina komt server-side uit page.tsx; volgende pagina's en filter-wissels
// halen hier hun data, zodat er nooit meer dan één pagina over de lijn gaat.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { loadCrmPeoplePage } from "@/lib/services/crmPeople";
import type { CrmPeopleFilters } from "@/lib/services/crmList";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  const url = new URL(request.url);
  const p = url.searchParams;
  const filters: CrmPeopleFilters = {
    kind: (p.get("kind") as CrmPeopleFilters["kind"]) || null,
    stage: p.get("stage") || null,
    temperature: p.get("temperature") || null,
    assigneeUserId: p.get("assignee") || null,
    search: p.get("search") || null,
    listId: p.get("listId") || null,
    industry: p.get("industry") || null,
    companySizeRange: p.get("size") || null,
    minScore: p.get("minScore") ? Number(p.get("minScore")) : null,
    disposition: p.get("disposition") || null,
    excludeLost: p.get("excludeLost") === "1",
    prospectType:
      (p.get("prospectType") as CrmPeopleFilters["prospectType"]) || null,
    // Iedereen ziet alle personen — geen per-AM-scope meer (besluit 2026-06-09).
    scopeAssignedTo: null,
  };
  const cursorCreatedAt = p.get("cursorCreatedAt");
  const cursorId = p.get("cursorId");
  const cursor =
    cursorCreatedAt && cursorId
      ? { createdAt: cursorCreatedAt, id: cursorId }
      : null;
  const limit = Number(p.get("limit")) || 50;

  const result = await loadCrmPeoplePage({
    sessionUserId: session.user.id,
    filters,
    cursor,
    limit,
  });
  return NextResponse.json({ success: true, ...result });
}
