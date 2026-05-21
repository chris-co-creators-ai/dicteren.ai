import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "CRM · Admin" };

export default function AdminCrmPage() {
  return (
    <AdminPlaceholder
      title="CRM"
      description="Klantkaarten met activatie-historie, contactmomenten en licentie-status. Eerste versie verschijnt na Slice 2 (database + auth)."
    />
  );
}
