import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "Affiliates · Admin" };

export default function AdminAffiliatesPage() {
  return (
    <AdminPlaceholder
      title="Affiliates"
      description="Partner-dashboards: doorverwijzingen, commissies, uitbetalingen en marketing-assets. Wordt gekoppeld aan de partner-aanvragen uit /zakelijk/affiliate-partners."
    />
  );
}
