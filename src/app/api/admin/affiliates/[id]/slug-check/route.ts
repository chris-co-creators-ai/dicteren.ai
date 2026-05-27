// Dicteren.ai — Admin: slug-availability check (excludeert eigen affiliate).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { validateSlugAvailable } from "@/lib/services/affiliateSlug";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";

  const result = await validateSlugAvailable(slug, id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }
  return NextResponse.json({ ok: true, slug: result.slug });
}
