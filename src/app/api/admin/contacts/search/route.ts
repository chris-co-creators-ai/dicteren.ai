// Dicteren.ai — GET /api/admin/contacts/search
//
// Cross-table dedup-zoekfunctie. Doorzoekt unified_contacts_v op email
// (exact), KvK (exact) en bedrijfsnaam (fuzzy Levenshtein ≤ 2).
//
// Gebruik:
//   /api/admin/contacts/search?email=jan@x.nl
//   /api/admin/contacts/search?kvk=12345678
//   /api/admin/contacts/search?name=Acme
//   /api/admin/contacts/search?email=...&kvk=...&name=...  (combinatie)
//
// Returnt array met match-info inclusief eigenaar zodat frontend popup
// kan tonen ("Dit contact bestaat al, eigenaar: Krishna").

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth/session";
import { findContactMatches } from "@/lib/services/contactDedup";
import { authUsers } from "@/lib/db/schema/auth-bridge";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const kvk = url.searchParams.get("kvk");
  const name = url.searchParams.get("name");

  if (!email && !kvk && !name) {
    return NextResponse.json(
      {
        success: false,
        error: "Geef minstens email, kvk of name mee",
      },
      { status: 400 },
    );
  }

  const matches = await findContactMatches({ email, kvk, name });

  // Verrijk owner_user_id met human-name (één lookup-tabel)
  const ownerIds = Array.from(
    new Set(matches.map((m) => m.ownerUserId).filter((v): v is string => !!v)),
  );
  const ownerRows = ownerIds.length
    ? await Promise.all(
        ownerIds.map(async (id) => {
          const [r] = await db
            .select({ id: authUsers.id, name: authUsers.name })
            .from(authUsers)
            .where(eq(authUsers.id, id))
            .limit(1);
          return r;
        }),
      )
    : [];
  const ownerMap = new Map(
    ownerRows.filter((r) => r).map((r) => [r!.id, r!.name]),
  );

  const enriched = matches.map((m) => ({
    ...m,
    ownerName: m.ownerUserId ? ownerMap.get(m.ownerUserId) ?? null : null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      matches: enriched,
      hasExactMatch: enriched.some(
        (m) => m.matchType === "exact_email" || m.matchType === "exact_kvk",
      ),
      count: enriched.length,
    },
  });
}
