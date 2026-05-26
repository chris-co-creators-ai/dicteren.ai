import Link from "next/link";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertAdminOnly } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/services/leadList";
import {
  listStaffBlocks,
  STAFF_BLOCKABLE_PATHS,
} from "@/lib/services/staffPermissions";
import { getEventsByActor } from "@/lib/services/audit";
import { StaffSettingsClient } from "./staff-settings-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff & rechten · Admin" };

export default async function StaffSettingsPage() {
  await assertAdminOnly();
  const [staff, blockMap] = await Promise.all([
    listAdminUsers(),
    listStaffBlocks(),
  ]);

  // Audit-feed per staff-user. Voor MVP: 50 events per user.
  const auditByUser = await Promise.all(
    staff.map((u) => getEventsByActor(u.id, 50)),
  );

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <Link
          href="/admin/settings"
          className="text-xs font-semibold text-muted-foreground hover:underline"
        >
          ← Terug naar instellingen
        </Link>
        <div className="mt-2 mb-6">
          <h1 className="text-2xl font-bold">Staff & rechten</h1>
          <p className="text-sm text-muted-foreground">
            Per medewerker page-toegang beperken bovenop hun rol, plus
            audit-feed van alle handelingen die ze in het platform doen.
            Admins zien dit voor alle admin + account-manager users.
          </p>
        </div>

        <StaffSettingsClient
          staff={staff.map((u, idx) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            blockedPaths: blockMap.get(u.id) ?? [],
            events: auditByUser[idx].map((e) => ({
              id: e.id,
              eventType: e.eventType,
              properties: e.properties,
              occurredAt: e.occurredAt.toISOString(),
            })),
          }))}
          allPaths={STAFF_BLOCKABLE_PATHS}
        />
      </main>
    </>
  );
}
