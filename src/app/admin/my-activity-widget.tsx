"use client";

import {
  Activity,
  ArrowRight,
  Building2,
  CheckSquare,
  Mail,
  MousePointerClick,
  PencilLine,
  Plus,
  Send,
  TriangleAlert,
} from "lucide-react";

// "Mijn activiteit" — de eigen CRM-handelingen van de ingelogde AM (crm_events),
// chronologisch. Transparantie: geen black box, alles wat een AM deed is zichtbaar.

export type ActivityItem = {
  id: string;
  kind: string;
  createdAt: string;
  orgId: string | null;
  orgName: string | null;
};

const KIND: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  created: { label: "Organisatie aangemaakt", icon: Plus, color: "#2563eb" },
  status_changed: { label: "Status gewijzigd", icon: ArrowRight, color: "#7c3aed" },
  field_updated: { label: "Gegevens bijgewerkt", icon: PencilLine, color: "#64748b" },
  contact_added: { label: "Contact toegevoegd", icon: Plus, color: "#2563eb" },
  contact_removed: { label: "Contact verwijderd", icon: TriangleAlert, color: "#dc2626" },
  email_sent: { label: "E-mail verstuurd", icon: Send, color: "#0ea5e9" },
  email_opened: { label: "E-mail geopend", icon: Mail, color: "#16a34a" },
  email_clicked: { label: "Link geklikt", icon: MousePointerClick, color: "#16a34a" },
  email_bounced: { label: "E-mail gebounced", icon: TriangleAlert, color: "#dc2626" },
  payment_link_generated: { label: "Betaallink aangemaakt", icon: PencilLine, color: "#ea580c" },
  payment_link_sent: { label: "Betaallink verstuurd", icon: Send, color: "#ea580c" },
  task_added: { label: "Taak toegevoegd", icon: Plus, color: "#2563eb" },
  task_completed: { label: "Taak voltooid", icon: CheckSquare, color: "#16a34a" },
  interaction_logged: { label: "Interactie gelogd", icon: Activity, color: "#7c3aed" },
};

function meta(kind: string) {
  if (KIND[kind]) return KIND[kind];
  if (kind.startsWith("outreach_"))
    return { label: kind.replace(/_/g, " "), icon: Send, color: "#0ea5e9" };
  return { label: kind.replace(/_/g, " "), icon: Activity, color: "#64748b" };
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "zojuist";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} u`;
  const d = Math.round(h / 24);
  return `${d} d`;
}

export function MyActivityWidget({ items }: { items: ActivityItem[] }) {
  return (
    <div className="brand-card overflow-hidden p-0">
      <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
        <h3 className="text-sm font-bold">Mijn activiteit</h3>
        <span className="ml-auto text-xs text-[color:var(--text-soft)]">
          laatste {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">
          Nog geen activiteit. Acties in het CRM verschijnen hier.
        </div>
      ) : (
        <ul>
          {items.map((a, i) => {
            const { label, icon: Icon, color } = meta(a.kind);
            const row = (
              <>
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-lg"
                  style={{ background: "var(--bg)" }}
                >
                  <Icon className="size-3.5" strokeWidth={2} style={{ color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{label}</div>
                  <div className="flex items-center gap-1 truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                    {a.orgName && <Building2 className="size-3 shrink-0" strokeWidth={2} />}
                    <span className="truncate">{a.orgName ?? "—"}</span>
                  </div>
                </div>
                <span className="shrink-0 text-[0.6875rem] text-[color:var(--text-soft)]">
                  {relative(a.createdAt)}
                </span>
              </>
            );
            const cls = `flex items-center gap-3 p-3.5 ${
              i > 0 ? "border-t border-[color:var(--border-soft)]" : ""
            }`;
            return (
              <li key={a.id} className={cls}>
                {row}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
