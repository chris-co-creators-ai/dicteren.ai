import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "Instellingen · Admin" };

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholder
      title="Instellingen"
      description="Brand, e-mail templates, Mollie-koppeling, DNS, model-CDN configuratie en team-accounts."
    />
  );
}
