import { requireAuth } from "@/lib/auth/session";
import { getReferralOverview } from "@/lib/services/referral";
import { emailBase } from "@/lib/url";
import { VriendenClient } from "./vrienden-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vrienden uitnodigen · Dicteren.ai" };

export default async function VriendenUitnodigenPage() {
  const session = await requireAuth();
  const overview = await getReferralOverview(session.user.id);
  const link = `${emailBase()}/r/${overview.code}`;
  const firstName = session.user.name?.trim().split(/\s+/)[0] ?? "";

  return <VriendenClient overview={overview} link={link} firstName={firstName} />;
}
