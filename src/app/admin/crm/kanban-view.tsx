"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type CrmStage =
  | "lead"
  | "prospect"
  | "mql"
  | "sql"
  | "customer"
  | "lost"
  | "churned";

type Temperature = "cold" | "lukewarm" | "warm" | "hot";

export type KanbanCustomer = {
  id: string;
  name: string;
  email: string;
  crmStage: CrmStage;
  crmTemperature: Temperature;
  segment: string;
  assignedToUserId: string | null;
  paidLicenseCount: number;
  trialStatus: string | null;
  accountOwner: { name: string; code: string } | null;
};

type AdminUser = {
  id: string;
  name: string;
};

const COLUMNS: { key: CrmStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "#6B7280" },
  { key: "prospect", label: "Prospect", color: "#3B82F6" },
  { key: "mql", label: "MQL", color: "#A855F7" },
  { key: "sql", label: "SQL", color: "#EAB308" },
  { key: "customer", label: "Klant", color: "#22C55E" },
  { key: "lost", label: "Verloren", color: "#EF4444" },
  { key: "churned", label: "Churned", color: "#F97316" },
];

const TEMP_DOT: Record<Temperature, string> = {
  cold: "#3B82F6",
  lukewarm: "#06B6D4",
  warm: "#F97316",
  hot: "#EF4444",
};

export function KanbanView({
  customers,
  adminUsers,
  onStageChange,
}: {
  customers: KanbanCustomer[];
  adminUsers: AdminUser[];
  onStageChange: (userId: string, stage: CrmStage) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped = new Map<CrmStage, KanbanCustomer[]>();
  for (const col of COLUMNS) grouped.set(col.key, []);
  for (const c of customers) {
    const list = grouped.get(c.crmStage);
    if (list) list.push(c);
  }

  const assigneeName = (id: string | null): string => {
    if (!id) return "Niet toegewezen";
    return adminUsers.find((u) => u.id === id)?.name ?? "Onbekend";
  };

  return (
    <div className="overflow-x-auto px-2 py-3">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map((col) => {
          const items = grouped.get(col.key) ?? [];
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) {
                  onStageChange(dragId, col.key);
                  setDragId(null);
                }
              }}
              className="w-72 shrink-0 rounded-2xl bg-[color:var(--bg)] p-2"
            >
              <div className="mb-2 flex items-center gap-2 px-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: col.color }}
                />
                <span className="text-sm font-bold">{col.label}</span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] p-3 text-center text-xs text-[color:var(--text-soft)]">
                    Sleep een klant hierheen
                  </div>
                ) : (
                  items.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "rounded-xl border border-[color:var(--border-soft)] bg-white p-3 shadow-sm transition-shadow",
                        dragId === c.id && "opacity-50",
                        "hover:shadow-md cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <Link
                        href={`/admin/crm/${c.id}`}
                        className="block"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 size-2 shrink-0 rounded-full"
                            style={{
                              background: TEMP_DOT[c.crmTemperature],
                            }}
                            title={c.crmTemperature}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {c.name}
                            </div>
                            <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                              {c.email}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 text-[0.625rem]">
                          <span className="rounded-full bg-[color:var(--bg-deep)] px-1.5 py-0.5 font-semibold">
                            {c.segment}
                          </span>
                          {c.paidLicenseCount > 0 && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-semibold text-green-800">
                              {c.paidLicenseCount}× lic
                            </span>
                          )}
                          {c.trialStatus === "active" && (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-800">
                              trial
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-[0.625rem] text-[color:var(--text-soft)]">
                          {assigneeName(c.assignedToUserId)}
                          {c.accountOwner && ` · ${c.accountOwner.code}`}
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
