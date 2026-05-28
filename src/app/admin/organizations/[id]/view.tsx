"use client";

import { useState } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  Video,
} from "lucide-react";

type Org = { id: string; name: string; slug: string | null };
type Owner = { userId: string; name: string; email: string };

type Snapshot = {
  totalSeats: number;
  assignedSeats: number;
  pendingSeats: number;
  unassignedFreeSeats: number;
  revokedSeats: number;
  activeDevicesTotal: number;
  maxDevicesTotal: number;
  utilizationPct: number;
  tierId: string;
  tierDiscountPct: number;
  perSeatPriceCents: number;
  totalAnnualCents: number;
  subscription: {
    id: string;
    status: string;
    nextBillingAt: string | null;
    mollieSubscriptionId: string;
    amountCents: number;
  } | null;
};

type SeatRow = {
  licenseId: string;
  code: string;
  status: string;
  assignedUserName: string | null;
  assignedUserEmail: string | null;
  pendingInvitationEmail: string | null;
  activeDevicesCount: number;
  assignedAt: string | null;
  issuedAt: string;
  expiresAt: string | null;
};

type DeviceRow = {
  activationId: string;
  licenseCode: string;
  memberName: string | null;
  memberEmail: string | null;
  platform: string | null;
  appVersion: string | null;
  activatedAt: string;
  lastSeenAt: string | null;
  isActive: boolean;
};

type HistoryRow = {
  id: string;
  oldSeats: number;
  newSeats: number;
  oldAmountCents: number;
  newAmountCents: number;
  oldTier: string | null;
  newTier: string | null;
  reason: string;
  prorataChargeCents: number | null;
  createdAt: string;
};

type PaymentRow = {
  id: string;
  molliePaymentId: string;
  amountCents: number;
  status: string;
  createdAt: string;
};

type BillingRow = {
  billingEmail: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;
  purchaseOrderNumber: string | null;
};

type AuditRow = {
  id: string;
  eventType: string;
  properties: Record<string, unknown> | null;
  occurredAt: string;
  userId: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  kind: string;
  dueAt: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

const TASK_KINDS: Array<{ value: string; label: string; icon: typeof Mail }> = [
  { value: "call", label: "Bellen", icon: Phone },
  { value: "email", label: "Mail", icon: Mail },
  { value: "meeting", label: "Afspraak", icon: Video },
  { value: "visit", label: "Op locatie", icon: MapPin },
  { value: "follow_up", label: "Follow-up", icon: CalendarDays },
  { value: "other", label: "Anders", icon: MessageSquare },
];

function taskKindMeta(kind: string) {
  return TASK_KINDS.find((k) => k.value === kind) ?? TASK_KINDS[TASK_KINDS.length - 1];
}

function eur(cents: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    ...opts,
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrgAdminView(props: {
  org: Org;
  owner: Owner | null;
  snapshot: Snapshot;
  seats: SeatRow[];
  devices: DeviceRow[];
  history: HistoryRow[];
  payments: PaymentRow[];
  billing: BillingRow | null;
  auditFeed: AuditRow[];
  crmOrganizationId: string | null;
  initialTasks: TaskRow[];
}) {
  const {
    org,
    owner,
    snapshot,
    seats,
    devices,
    history,
    payments,
    billing,
    auditFeed,
    crmOrganizationId,
    initialTasks,
  } = props;

  return (
    <div className="grid gap-5">
      {/* Header */}
      <div className="brand-card flex flex-wrap items-start gap-4 p-5">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl"
          style={{ background: "var(--bg-deep)" }}
        >
          <Building2
            className="size-6"
            strokeWidth={1.8}
            style={{ color: "var(--navy)" }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          <div className="mt-1 text-xs text-[color:var(--text-muted)]">
            slug: <span className="font-mono">{org.slug ?? "—"}</span> · id:{" "}
            <span className="font-mono">{org.id}</span>
          </div>
          {owner && (
            <div className="mt-2 text-sm">
              Owner: <strong>{owner.name}</strong>{" "}
              <span className="text-[color:var(--text-muted)]">
                ({owner.email})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Snapshot strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Seats" value={`${snapshot.assignedSeats} / ${snapshot.totalSeats}`} detail={`${snapshot.pendingSeats} pending`} />
        <Kpi label="Apparaten" value={`${snapshot.activeDevicesTotal} / ${snapshot.maxDevicesTotal}`} detail={`${snapshot.utilizationPct}% bezet`} />
        <Kpi
          label="Subscription"
          value={snapshot.subscription?.status ?? "—"}
          detail={
            snapshot.subscription?.nextBillingAt
              ? `Incasso ${formatDate(snapshot.subscription.nextBillingAt)}`
              : "Geen actieve sub"
          }
        />
        <Kpi
          label="Jaar-bedrag"
          value={eur(snapshot.subscription?.amountCents ?? snapshot.totalAnnualCents)}
          detail={`${snapshot.tierDiscountPct}% staffel-korting`}
        />
      </div>

      {/* Taken — voor account-managers + admin */}
      <TasksSection
        crmOrganizationId={crmOrganizationId}
        initialTasks={initialTasks}
      />

      {/* Subscription history */}
      <Section title="Subscription history">
        {history.length === 0 ? (
          <EmptyText>Nog geen seat-mutaties.</EmptyText>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--border-soft)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[color:var(--bg)] text-left uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                  <th className="px-3 py-2">Wanneer</th>
                  <th className="px-3 py-2">Reden</th>
                  <th className="px-3 py-2 text-center">Seats</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2 text-right">Bedrag/jaar</th>
                  <th className="px-3 py-2 text-right">Pro-rata</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t border-[color:var(--border-soft)]"
                  >
                    <td className="px-3 py-2">{formatDateTime(h.createdAt)}</td>
                    <td className="px-3 py-2">{h.reason}</td>
                    <td className="px-3 py-2 text-center font-mono">
                      {h.oldSeats} → {h.newSeats}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {h.oldTier ?? "—"} → {h.newTier ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {eur(h.oldAmountCents, { maximumFractionDigits: 0 })} →{" "}
                      {eur(h.newAmountCents, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {h.prorataChargeCents ? eur(h.prorataChargeCents) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Seats */}
      <Section title={`Seats (${seats.length})`}>
        <div className="overflow-x-auto rounded-xl border border-[color:var(--border-soft)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[color:var(--bg)] text-left uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Toegewezen aan</th>
                <th className="px-3 py-2 text-center">Devices</th>
                <th className="px-3 py-2">Verloopt</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => (
                <tr
                  key={s.licenseId}
                  className="border-t border-[color:var(--border-soft)]"
                >
                  <td className="px-3 py-2 font-mono">{s.code}</td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2">
                    {s.assignedUserName
                      ? `${s.assignedUserName} (${s.assignedUserEmail})`
                      : s.pendingInvitationEmail
                        ? `pending: ${s.pendingInvitationEmail}`
                        : "—"}
                  </td>
                  <td className="px-3 py-2 text-center font-mono">
                    {s.activeDevicesCount} / 2
                  </td>
                  <td className="px-3 py-2">{formatDate(s.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Devices */}
      <Section title={`Apparaten (${devices.filter((d) => d.isActive).length} actief)`}>
        {devices.length === 0 ? (
          <EmptyText>Nog geen activaties.</EmptyText>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--border-soft)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[color:var(--bg)] text-left uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Platform</th>
                  <th className="px-3 py-2">Versie</th>
                  <th className="px-3 py-2">Laatst gezien</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr
                    key={d.activationId}
                    className="border-t border-[color:var(--border-soft)]"
                  >
                    <td className="px-3 py-2">
                      {d.memberName ?? d.memberEmail ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">{d.licenseCode}</td>
                    <td className="px-3 py-2">{d.platform ?? "—"}</td>
                    <td className="px-3 py-2">{d.appVersion ?? "—"}</td>
                    <td className="px-3 py-2">
                      {formatDateTime(d.lastSeenAt)}
                    </td>
                    <td className="px-3 py-2">
                      {d.isActive ? (
                        <span className="rounded-full bg-[color:var(--aqua-50)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--navy)]">
                          actief
                        </span>
                      ) : (
                        <span className="rounded-full bg-[color:var(--bg-deep)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-muted)]">
                          uit
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Payments */}
      <Section title="Betalingen">
        {payments.length === 0 ? (
          <EmptyText>Nog geen betalingen.</EmptyText>
        ) : (
          <ul className="divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)]">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <div className="font-mono">{p.molliePaymentId}</div>
                  <div className="text-[color:var(--text-muted)]">
                    {formatDateTime(p.createdAt)} · {p.status}
                  </div>
                </div>
                <div className="font-mono font-semibold">
                  {eur(p.amountCents)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Audit feed */}
      <Section title="Audit feed (laatste 100)">
        {auditFeed.length === 0 ? (
          <EmptyText>Geen events.</EmptyText>
        ) : (
          <ul className="divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)]">
            {auditFeed.map((a) => (
              <li key={a.id} className="p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{a.eventType}</span>
                  <span className="text-[color:var(--text-muted)]">
                    {formatDateTime(a.occurredAt)}
                  </span>
                </div>
                {a.properties && (
                  <pre className="mt-1 overflow-x-auto rounded bg-[color:var(--bg)] p-2 text-[10px]">
                    {JSON.stringify(a.properties, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Billing */}
      <Section title="Factuurgegevens">
        {billing ? (
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <Field label="Factuur-email" value={billing.billingEmail} />
            <Field label="BTW-nummer" value={billing.vatNumber} />
            <Field label="Adres-regel 1" value={billing.addressLine1} />
            <Field label="Adres-regel 2" value={billing.addressLine2} />
            <Field label="Postcode" value={billing.postalCode} />
            <Field label="Plaats" value={billing.city} />
            <Field label="Land" value={billing.countryCode} />
            <Field label="PO-nummer" value={billing.purchaseOrderNumber} />
          </dl>
        ) : (
          <EmptyText>Geen factuurgegevens.</EmptyText>
        )}
      </Section>
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="brand-card p-4">
      <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
        {detail}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="brand-card p-5">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[0.625rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-[color:var(--text-muted)]">{children}</p>
  );
}

function TasksSection({
  crmOrganizationId,
  initialTasks,
}: {
  crmOrganizationId: string | null;
  initialTasks: TaskRow[];
}) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("call");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!crmOrganizationId) {
    return (
      <Section title="Taken">
        <EmptyText>
          Deze organisatie heeft (nog) geen CRM-record. Taken hangen aan
          crm_organizations — die wordt automatisch aangemaakt bij paid
          checkout. Voor handmatige aanmaak: open /admin/crm.
        </EmptyText>
      </Section>
    );
  }

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/crm/organizations/${crmOrganizationId}/tasks`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            kind,
            dueAt: dueDate ? `${dueDate}T09:00:00` : null,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        const t = data.data;
        setTasks([
          {
            id: t.id,
            title: t.title,
            kind: t.kind,
            dueAt: t.dueAt,
            notes: t.notes,
            completedAt: t.completedAt,
            createdAt: t.createdAt,
          },
          ...tasks,
        ]);
        setTitle("");
        setDueDate("");
      } else {
        setError(data.error ?? "Toevoegen mislukt");
      }
    } catch {
      setError("Netwerkprobleem");
    } finally {
      setSaving(false);
    }
  }

  async function complete(taskId: string) {
    const res = await fetch(`/api/admin/crm/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const data = await res.json();
    if (data.success) {
      setTasks(
        tasks.map((t) =>
          t.id === taskId
            ? { ...t, completedAt: new Date().toISOString() }
            : t,
        ),
      );
    }
  }

  async function remove(taskId: string) {
    if (!confirm("Taak verwijderen?")) return;
    const res = await fetch(`/api/admin/crm/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (res.ok) setTasks(tasks.filter((t) => t.id !== taskId));
  }

  function quickDue(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
  }

  const open = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);

  return (
    <Section title={`Taken (${open.length} open)`}>
      <div className="grid gap-4">
        {/* Quick-add */}
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
          <div className="grid gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
              }}
              placeholder="Bel klant over openstaande Mollie-betaling…"
              className="w-full rounded border border-[color:var(--border-soft)] bg-white px-2 py-1.5 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
              >
                {TASK_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => quickDue(0)}
                  className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-[0.6875rem] hover:bg-[color:var(--bg-deep)]"
                >
                  Vandaag
                </button>
                <button
                  onClick={() => quickDue(1)}
                  className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-[0.6875rem] hover:bg-[color:var(--bg-deep)]"
                >
                  Morgen
                </button>
                <button
                  onClick={() => quickDue(7)}
                  className="rounded border border-[color:var(--border-soft)] bg-white px-2 py-1 text-[0.6875rem] hover:bg-[color:var(--bg-deep)]"
                >
                  +7 dagen
                </button>
              </div>
              <button
                onClick={addTask}
                disabled={saving || !title.trim()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--orange)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                <Plus className="size-3.5" strokeWidth={2.4} />
                Taak toevoegen
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-[0.6875rem] text-red-700">{error}</div>
          )}
        </div>

        {/* Open */}
        {open.length === 0 ? (
          <EmptyText>Geen openstaande taken.</EmptyText>
        ) : (
          <ul className="grid gap-2">
            {open.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onComplete={() => complete(t.id)}
                onDelete={() => remove(t.id)}
              />
            ))}
          </ul>
        )}

        {/* Done — collapsed */}
        {done.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-[color:var(--text-muted)]">
              Afgerond ({done.length})
            </summary>
            <ul className="mt-2 grid gap-2">
              {done.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onComplete={() => complete(t.id)}
                  onDelete={() => remove(t.id)}
                />
              ))}
            </ul>
          </details>
        )}
      </div>
    </Section>
  );
}

function TaskRow({
  task,
  onComplete,
  onDelete,
}: {
  task: TaskRow;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const meta = taskKindMeta(task.kind);
  const Icon = meta.icon;
  const isDone = Boolean(task.completedAt);
  const isOverdue =
    !isDone && task.dueAt !== null && new Date(task.dueAt).getTime() < Date.now();

  return (
    <li
      className={
        "flex items-start gap-3 rounded-lg border p-3 " +
        (isOverdue
          ? "border-red-200 bg-red-50/40"
          : "border-[color:var(--border-soft)] bg-white")
      }
    >
      <button
        onClick={onComplete}
        className={
          "grid size-5 shrink-0 place-items-center rounded border " +
          (isDone
            ? "border-green-600 bg-green-600 text-white"
            : "border-[color:var(--border-soft)] hover:border-[color:var(--orange)]")
        }
        title={isDone ? "Al afgerond" : "Markeer als af"}
      >
        {isDone && <Check className="size-3" strokeWidth={3} />}
      </button>
      <div className="flex-1">
        <div
          className={
            "flex items-center gap-2 text-sm font-semibold " +
            (isDone ? "text-[color:var(--text-muted)] line-through" : "")
          }
        >
          <Icon className="size-3.5 text-[color:var(--text-muted)]" />
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.6875rem] text-[color:var(--text-muted)]">
          <span>{meta.label}</span>
          {task.dueAt && (
            <span
              className={isOverdue ? "font-bold text-red-700" : undefined}
            >
              · {new Date(task.dueAt).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}
              {isOverdue && " (verlopen)"}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {task.notes}
          </p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="grid size-7 place-items-center rounded-full hover:bg-red-50"
        title="Verwijder taak"
      >
        <Trash2 className="size-3 text-red-600" />
      </button>
    </li>
  );
}
