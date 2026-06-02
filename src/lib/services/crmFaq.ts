// Dicteren.ai — Gedeelde FAQ-knowledgebase voor account managers.
// Eigen toegevoegde Q&A (crm_faq). De standaardvragen leven als constante in
// de client (statische tekst, getoetst aan app-truth). Alle staff zien alle
// custom-FAQ — een collectief objection-handling-playbook.

import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmFaq, authUsers, type CrmFaq } from "@/lib/db/schema";

export type CustomFaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  createdByName: string | null;
  createdAt: string;
};

export async function listCustomFaq(): Promise<CustomFaqRow[]> {
  const rows = await db
    .select({
      id: crmFaq.id,
      question: crmFaq.question,
      answer: crmFaq.answer,
      category: crmFaq.category,
      createdByName: authUsers.name,
      createdAt: crmFaq.createdAt,
    })
    .from(crmFaq)
    .leftJoin(authUsers, eq(authUsers.id, crmFaq.createdByUserId))
    .orderBy(desc(crmFaq.createdAt));
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    category: r.category,
    createdByName: r.createdByName ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function addFaq(args: {
  question: string;
  answer: string;
  category?: string | null;
  userId: string;
}): Promise<CrmFaq | null> {
  const question = args.question.trim();
  const answer = args.answer.trim();
  if (!question || !answer) return null;
  const [row] = await db
    .insert(crmFaq)
    .values({
      question,
      answer,
      category: args.category?.trim() || null,
      createdByUserId: args.userId,
    })
    .returning();
  return row ?? null;
}

export async function deleteFaq(id: string): Promise<void> {
  await db.delete(crmFaq).where(eq(crmFaq.id, id));
}
