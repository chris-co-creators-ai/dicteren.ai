"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { issuePartnerCode, updatePartnerOrg } from "@/lib/services";

export type UpdatePartnerInput = {
  id: string;
  priority?: string | null;
  segment?: string | null;
  organizationName?: string;
  organizationType?: string | null;
  whyRelevant?: string | null;
  partnershipAngle?: string | null;
  openingLine?: string | null;
  offer?: string | null;
  decisionMaker?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  website?: string | null;
  contactUrl?: string | null;
  sourceUrl?: string | null;
  sourceStatus?: string | null;
  sourceVerifiedAt?: string | null;
  accountOwner?: string | null;
  outreachStatus?: string | null;
  lastContactDate?: string | null;
  nextAction?: string | null;
  followUpDate?: string | null;
  responseSummary?: string | null;
  pilotStatus?: string | null;
  freeCodesCount?: number | null;
  gdprNotes?: string | null;
};

export async function updatePartnerAction(input: UpdatePartnerInput) {
  const session = await requireAdmin();
  const { id, ...patch } = input;
  const updated = await updatePartnerOrg(id, patch, session.user.id);
  if (!updated) return { success: false as const, error: "Niet gevonden" };
  revalidatePath(`/admin/partners/${id}`);
  revalidatePath(`/admin/partners`);
  return { success: true as const };
}

export async function issuePartnerCodeAction(input: {
  partnerOrgId: string;
  seats: number;
  expiresAt: string | null;
}) {
  const session = await requireAdmin();
  const result = await issuePartnerCode({
    partnerOrgId: input.partnerOrgId,
    seats: input.seats,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    actorId: session.user.id,
  });
  if (!result.success) return result;
  revalidatePath(`/admin/partners/${input.partnerOrgId}`);
  revalidatePath(`/admin/partners`);
  return {
    success: true as const,
    code: result.license.code,
    isExisting: result.isExisting,
  };
}
