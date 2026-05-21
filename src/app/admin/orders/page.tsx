import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "Orders · Admin" };

export default function AdminOrdersPage() {
  return (
    <AdminPlaceholder
      title="Orders"
      description="Overzicht van Mollie-bestellingen, betaalstatus en levering. Wordt gevuld zodra checkout live is in Slice 6."
    />
  );
}
