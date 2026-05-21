import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = {
  title: "Admin",
  description: "Dicteren.ai admin dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  return (
    <div className="flex min-h-screen w-full lg:grid lg:grid-cols-[14.5rem_1fr]">
      <AdminSidebar user={session.user} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
