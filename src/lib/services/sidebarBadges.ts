// Dicteren.ai — Live counts voor admin-sidebar badges.

import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliates,
  contactMessages,
  subscriptions,
} from "@/lib/db/schema";

export type SidebarBadges = {
  messages: number;
  affiliates: number;
  pastDue: number;
};

export async function getSidebarBadges(): Promise<SidebarBadges> {
  const [m, a, p] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(eq(contactMessages.status, "new")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(affiliates)
      .where(eq(affiliates.status, "pending")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "past_due")),
  ]);
  return {
    messages: m[0]?.n ?? 0,
    affiliates: a[0]?.n ?? 0,
    pastDue: p[0]?.n ?? 0,
  };
}
