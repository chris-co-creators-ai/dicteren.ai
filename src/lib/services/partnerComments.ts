// Dicteren.ai — Comments / status-log per partner-organisatie.

import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerComments, type PartnerComment } from "@/lib/db/schema";
import { authUser } from "@/lib/db/auth-schema";
import { logEvent } from "./audit";

export async function addPartnerComment(args: {
  partnerOrgId: string;
  body: string;
  authorUserId: string;
}): Promise<PartnerComment> {
  const [row] = await db
    .insert(partnerComments)
    .values({
      partnerOrgId: args.partnerOrgId,
      body: args.body.trim(),
      authorUserId: args.authorUserId,
    })
    .returning();

  await logEvent({
    action: "partner.comment_added",
    entityType: "partner_comment",
    entityId: row.id,
    actorId: args.authorUserId,
    metadata: { partnerOrgId: args.partnerOrgId },
  });

  return row;
}

export type CommentWithAuthor = PartnerComment & {
  authorName: string | null;
};

export async function listPartnerComments(
  partnerOrgId: string,
): Promise<CommentWithAuthor[]> {
  const rows = await db
    .select({
      comment: partnerComments,
      authorName: authUser.name,
    })
    .from(partnerComments)
    .leftJoin(authUser, eq(authUser.id, partnerComments.authorUserId))
    .where(eq(partnerComments.partnerOrgId, partnerOrgId))
    .orderBy(desc(partnerComments.createdAt));

  return rows.map((r) => ({ ...r.comment, authorName: r.authorName ?? null }));
}
