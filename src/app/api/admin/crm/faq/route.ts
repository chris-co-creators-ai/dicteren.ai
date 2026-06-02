// Dicteren.ai — Gedeelde FAQ: lijst + toevoegen (admin + account manager).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { addFaq, listCustomFaq } from "@/lib/services/crmFaq";

export async function GET() {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const items = await listCustomFaq();
  return NextResponse.json({ success: true, items });
}

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  let body: { question?: string; answer?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body ontbreekt" }, { status: 400 });
  }
  if (!body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json(
      { success: false, error: "Vraag en antwoord zijn verplicht" },
      { status: 400 },
    );
  }
  const row = await addFaq({
    question: body.question,
    answer: body.answer,
    category: body.category ?? null,
    userId: guard.session.user.id,
  });
  return NextResponse.json({ success: Boolean(row), id: row?.id });
}
