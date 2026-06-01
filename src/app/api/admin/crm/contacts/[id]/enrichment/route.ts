// Dicteren.ai — Handmatige prospect-verrijking bijwerken (staff).
//   PATCH { ...EnrichmentPatch }
// Een AM bewerkt de Clay-aligned velden tijdens prospecting; total_reach wordt
// server-side herberekend uit de follower-velden.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  updateContactEnrichment,
  type EnrichmentPatch,
} from "@/lib/services/crmContactEnrichment";

const TEXT_FIELDS = [
  "jobTitle",
  "seniority",
  "department",
  "linkedinUrl",
  "twitterUrl",
  "city",
  "country",
  "companyName",
  "companyDomain",
  "niche",
  "industry",
  "companySizeRange",
  "revenueRange",
  "lastChannel",
] as const;

const NUM_FIELDS = [
  "employeeCount",
  "foundedYear",
  "followersLinkedin",
  "followersInstagram",
  "followersFacebook",
  "followersYoutube",
  "followersSubstack",
  "followersOwn",
  "leadScore",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ongeldig" },
      { status: 400 },
    );
  }

  // Whitelist + type-coercie: alleen toegestane velden, getallen genormaliseerd.
  const patch: EnrichmentPatch = {};
  for (const f of TEXT_FIELDS) {
    if (f in body) {
      const v = body[f];
      patch[f] = typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    }
  }
  for (const f of NUM_FIELDS) {
    if (f in body) {
      const v = body[f];
      const n = typeof v === "number" ? v : Number(v);
      patch[f] = Number.isFinite(n) ? Math.trunc(n) : null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { success: false, error: "Geen velden" },
      { status: 400 },
    );
  }

  const result = await updateContactEnrichment({
    contactId: id,
    patch,
    actorUserId: guard.session.user.id,
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "Prospect niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}
