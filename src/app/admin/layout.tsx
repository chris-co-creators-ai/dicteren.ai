import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Admin",
  description: "Dicteren.ai admin dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full lg:grid lg:grid-cols-[14.5rem_1fr]">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
