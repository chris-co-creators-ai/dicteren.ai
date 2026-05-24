import { listUserLicenses } from "@/lib/services";
import { getSession } from "@/lib/auth/session";
import { LicensesView } from "./licenses-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn licenties · Dicteren.ai" };

export default async function AccountLicensesPage() {
  const session = (await getSession())!;
  const licenses = await listUserLicenses(session.user.id);
  return <LicensesView licenses={licenses} />;
}
