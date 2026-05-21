import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata = { title: "Analytics · Admin" };

export default function AdminAnalyticsPage() {
  return (
    <AdminPlaceholder
      title="Analytics"
      description="Activatie-trends, model-installatie slagingspercentages, dictée-volumes en conversie per kanaal. Eerst event-spec uitwerken, daarna SDK koppelen."
    />
  );
}
