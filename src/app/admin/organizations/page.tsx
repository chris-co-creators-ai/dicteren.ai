import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "Organisaties · Admin" };

export default function AdminOrganizationsPage() {
  return (
    <AdminPlaceholder
      title="Organisaties"
      description="Zakelijke klanten met teamzitplaatsen, contactpersonen, contract-info en koppeling naar facturen."
    />
  );
}
