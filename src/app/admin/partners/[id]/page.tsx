import { notFound } from "next/navigation";
import { getPartnerOrg } from "@/lib/services";
import { PartnerDetailView } from "./partner-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPartnerOrg(id);
  if (!data) notFound();

  const { org, license, activations } = data;

  return (
    <PartnerDetailView
      org={{
        ...org,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      }}
      license={
        license
          ? {
              id: license.id,
              code: license.code,
              status: license.status,
              seats: license.seats,
              maxActivationsPerSeat: license.maxActivationsPerSeat,
              activationCount: license.activationCount,
              expiresAt: license.expiresAt?.toISOString() ?? null,
              issuedAt: license.issuedAt.toISOString(),
            }
          : null
      }
      activations={activations.map((a) => ({
        id: a.id,
        deviceId: a.deviceId,
        isActive: a.isActive,
        activatedAt: a.activatedAt.toISOString(),
        lastTokenIssuedAt: a.lastTokenIssuedAt?.toISOString() ?? null,
      }))}
    />
  );
}
