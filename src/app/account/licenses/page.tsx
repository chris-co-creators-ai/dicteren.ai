import { listUserLicenses, listUserDevices } from "@/lib/services";
import { getSession } from "@/lib/auth/session";
import { LicensesView } from "./licenses-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn licenties · Dicteren.ai" };

export default async function AccountLicensesPage() {
  const session = (await getSession())!;
  const [licenses, devices] = await Promise.all([
    listUserLicenses(session.user.id),
    listUserDevices(session.user.id),
  ]);
  return <LicensesView licenses={licenses} devices={devices} />;
}
