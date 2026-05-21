import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "Facturen · Admin" };

export default function AdminInvoicesPage() {
  return (
    <AdminPlaceholder
      title="Facturen"
      description="Genereerde facturen per order, downloadbaar als PDF, met betalingsstatus en herinneringen."
    />
  );
}
