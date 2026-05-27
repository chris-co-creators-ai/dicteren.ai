"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";

type Admin = { id: string; name: string; email: string };

type Org = {
  id: string;
  name: string;
  kvk: string | null;
  vatNumber: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;
  status: string;
  source: string;
  accountOwnerId: string | null;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  proposedSeats: number | null;
  proposedAmountCents: number | null;
  proposedPlanSlug: string | null;
  discountCode: string | null;
  authOrganizationId: string | null;
  paymentLinkUrl: string | null;
  paymentLinkSentAt: string | null;
  paidAt: string | null;
  lostReason: string | null;
};

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleAtCompany: string | null;
  isPrimary: boolean;
  authUserId: string | null;
};

type TimelineEvent = {
  id: string;
  kind: string;
  actorName: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  kind: string;
  dueAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
};

const STATUSES = [
  { key: "lead", label: "Nieuw" },
  { key: "contacted", label: "Benaderd" },
  { key: "qualified", label: "Gekwalificeerd" },
  { key: "proposal_sent", label: "Betaal-link verzonden" },
  { key: "negotiating", label: "In gesprek" },
  { key: "won", label: "Klant" },
  { key: "lost", label: "Verloren" },
];

const TABS = [
  { key: "details", label: "Details" },
  { key: "contacts", label: "Contacten" },
  { key: "payment", label: "Betaling" },
  { key: "timeline", label: "Timeline" },
  { key: "tasks", label: "Taken" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Props = {
  orgId: string;
  admins: Admin[];
  onClose: () => void;
  onChanged: () => void;
};

function fmtCents(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtDate(iso: string | null, includeTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function OrgSidePanel({
  orgId,
  admins,
  onClose,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<TabKey>("details");
  const [org, setOrg] = useState<Org | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [orgRes, contactsRes, timelineRes, tasksRes] = await Promise.all([
      fetch(`/api/admin/crm/organizations/${orgId}`),
      fetch(`/api/admin/crm/organizations/${orgId}/contacts`),
      fetch(`/api/admin/crm/organizations/${orgId}/timeline`),
      fetch(`/api/admin/crm/organizations/${orgId}/tasks`),
    ]);
    const orgJson = await orgRes.json();
    const contactsJson = await contactsRes.json();
    const timelineJson = await timelineRes.json();
    const tasksJson = await tasksRes.json();
    if (orgJson.success) setOrg(orgJson.data);
    if (contactsJson.success) setContacts(contactsJson.data);
    if (timelineJson.success) setEvents(timelineJson.data);
    if (tasksJson.success) setTasks(tasksJson.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function patchOrg(patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/crm/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadAll();
      onChanged();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 border-b bg-white px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-[color:var(--navy)]">
                {org?.name ?? "Laden..."}
              </h2>
              {org && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={org.status}
                    onChange={(e) => patchOrg({ status: e.target.value })}
                    className="rounded-md border bg-white px-2 py-1 font-semibold"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[color:var(--text-muted)]">
                    {org.source}
                  </span>
                  {org.kvk && (
                    <span className="text-[color:var(--text-muted)]">
                      KvK {org.kvk}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-[color:var(--bg)]"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-[color:var(--navy)] text-white"
                    : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading || !org ? (
            <div className="py-12 text-center text-sm text-[color:var(--text-muted)]">
              Laden...
            </div>
          ) : tab === "details" ? (
            <DetailsTab org={org} admins={admins} onSave={patchOrg} />
          ) : tab === "contacts" ? (
            <ContactsTab
              orgId={orgId}
              contacts={contacts}
              onChanged={loadAll}
            />
          ) : tab === "payment" ? (
            <PaymentTab org={org} onChanged={loadAll} />
          ) : tab === "timeline" ? (
            <TimelineTab events={events} />
          ) : (
            <TasksTab orgId={orgId} tasks={tasks} onChanged={loadAll} />
          )}
        </div>
      </div>
    </div>
  );
}

// ───── Details tab ─────

function DetailsTab({
  org,
  admins,
  onSave,
}: {
  org: Org;
  admins: Admin[];
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [f, setF] = useState(org);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      name: f.name,
      kvk: f.kvk,
      vatNumber: f.vatNumber,
      website: f.website,
      addressLine1: f.addressLine1,
      addressLine2: f.addressLine2,
      postalCode: f.postalCode,
      city: f.city,
      countryCode: f.countryCode,
      accountOwnerId: f.accountOwnerId,
      notes: f.notes,
      nextAction: f.nextAction,
      nextActionAt: f.nextActionAt,
      proposedSeats: f.proposedSeats,
      proposedAmountCents: f.proposedAmountCents,
      proposedPlanSlug: f.proposedPlanSlug,
      discountCode: f.discountCode,
      lostReason: f.lostReason,
    });
    setSaving(false);
  }

  return (
    <div className="space-y-3 text-sm">
      <Section title="Bedrijf">
        <TextField label="Naam" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="KvK" value={f.kvk ?? ""} onChange={(v) => setF({ ...f, kvk: v })} />
          <TextField label="BTW-nummer" value={f.vatNumber ?? ""} onChange={(v) => setF({ ...f, vatNumber: v })} />
        </div>
        <TextField label="Website" value={f.website ?? ""} onChange={(v) => setF({ ...f, website: v })} />
      </Section>

      <Section title="Adres">
        <TextField label="Straat + nummer" value={f.addressLine1 ?? ""} onChange={(v) => setF({ ...f, addressLine1: v })} />
        <TextField label="Adres extra" value={f.addressLine2 ?? ""} onChange={(v) => setF({ ...f, addressLine2: v })} />
        <div className="grid grid-cols-3 gap-2">
          <TextField label="Postcode" value={f.postalCode ?? ""} onChange={(v) => setF({ ...f, postalCode: v })} />
          <TextField label="Plaats" value={f.city ?? ""} onChange={(v) => setF({ ...f, city: v })} />
          <TextField label="Land" value={f.countryCode ?? "NL"} onChange={(v) => setF({ ...f, countryCode: v })} />
        </div>
      </Section>

      <Section title="Pijplijn">
        <label className="block">
          <span className="text-xs font-semibold">Owner</span>
          <select
            value={f.accountOwnerId ?? ""}
            onChange={(e) => setF({ ...f, accountOwnerId: e.target.value || null })}
            className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">— Niet toegewezen —</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.email})
              </option>
            ))}
          </select>
        </label>
        <TextField label="Volgende actie" value={f.nextAction ?? ""} onChange={(v) => setF({ ...f, nextAction: v })} />
        <label className="block">
          <span className="text-xs font-semibold">Notities</span>
          <textarea
            value={f.notes ?? ""}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
        </label>
      </Section>

      <Section title="Deal">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Seats"
            value={f.proposedSeats ?? null}
            onChange={(v) => setF({ ...f, proposedSeats: v })}
          />
          <NumberField
            label="Bedrag (€)"
            value={f.proposedAmountCents ? f.proposedAmountCents / 100 : null}
            onChange={(v) =>
              setF({
                ...f,
                proposedAmountCents: v != null ? Math.round(v * 100) : null,
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Plan-slug" value={f.proposedPlanSlug ?? ""} onChange={(v) => setF({ ...f, proposedPlanSlug: v })} />
          <TextField label="Kortingscode" value={f.discountCode ?? ""} onChange={(v) => setF({ ...f, discountCode: v })} />
        </div>
      </Section>

      {f.status === "lost" && (
        <Section title="Verloren">
          <TextField label="Reden" value={f.lostReason ?? ""} onChange={(v) => setF({ ...f, lostReason: v })} />
        </Section>
      )}

      <div className="sticky bottom-0 -mx-6 -mb-5 border-t bg-white px-6 py-3" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--orange)" }}
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}

// ───── Contacts tab ─────

function ContactsTab({
  orgId,
  contacts,
  onChanged,
}: {
  orgId: string;
  contacts: Contact[];
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleAtCompany: "",
    isPrimary: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!form.name || !form.email) return;
    setSaving(true);
    await fetch(`/api/admin/crm/organizations/${orgId}/contacts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", phone: "", roleAtCompany: "", isPrimary: false });
    setAddOpen(false);
    setSaving(false);
    onChanged();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Contact verwijderen?")) return;
    await fetch(`/api/admin/crm/contacts/${id}`, { method: "DELETE" });
    onChanged();
  }

  async function handleSetPrimary(id: string) {
    await fetch(`/api/admin/crm/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    onChanged();
  }

  return (
    <div className="space-y-3 text-sm">
      {contacts.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border bg-white p-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[color:var(--navy)]">{c.name}</span>
                {c.isPrimary && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                    style={{ background: "var(--orange)" }}
                  >
                    Primair
                  </span>
                )}
                {c.authUserId && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: "var(--aqua-50)", color: "var(--navy)" }}
                  >
                    Account
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-[color:var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3" /> {c.email}
                </span>
                {c.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" /> {c.phone}
                  </span>
                )}
                {c.roleAtCompany && (
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3" /> {c.roleAtCompany}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {!c.isPrimary && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(c.id)}
                  className="rounded-md p-1.5 text-xs text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]"
                  title="Markeer als primair"
                >
                  <Check className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="rounded-md p-1.5 text-xs text-[color:var(--text-muted)] hover:bg-[color:var(--bg)] hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {addOpen ? (
        <div
          className="space-y-2 rounded-lg border bg-[color:var(--aqua-50)] p-3"
          style={{ borderColor: "var(--aqua-200)" }}
        >
          <TextField label="Naam *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextField label="E-mail *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Telefoon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <TextField label="Functie" value={form.roleAtCompany} onChange={(v) => setForm({ ...form, roleAtCompany: v })} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
            />
            Markeer als primair contact
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--border)" }}
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.name || !form.email}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: "var(--orange)" }}
            >
              {saving ? "..." : "Toevoegen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
          style={{ borderColor: "var(--border)" }}
        >
          <Plus className="size-3.5" strokeWidth={2.4} />
          Contact toevoegen
        </button>
      )}
    </div>
  );
}

// ───── Payment tab ─────

function PaymentTab({
  org,
  onChanged,
}: {
  org: Org;
  onChanged: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendPaymentLink() {
    setSending(true);
    setError(null);
    const res = await fetch(
      `/api/admin/crm/organizations/${org.id}/payment-link`,
      { method: "POST" },
    );
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Verzenden mislukt");
    } else {
      onChanged();
    }
    setSending(false);
  }

  async function resendPaymentLink() {
    setSending(true);
    setError(null);
    await fetch(
      `/api/admin/crm/organizations/${org.id}/payment-link/resend`,
      { method: "POST" },
    );
    onChanged();
    setSending(false);
  }

  async function markPaidOffline() {
    if (!window.confirm("Deze deal markeren als handmatig betaald?")) return;
    setSending(true);
    await fetch(
      `/api/admin/crm/organizations/${org.id}/mark-paid`,
      { method: "POST" },
    );
    onChanged();
    setSending(false);
  }

  return (
    <div className="space-y-4 text-sm">
      {org.paidAt ? (
        <div
          className="rounded-lg border p-4"
          style={{ background: "#F0FDF4", borderColor: "#86EFAC" }}
        >
          <div className="flex items-center gap-2 font-bold text-green-700">
            <CheckCircle2 className="size-4" />
            Betaald op {fmtDate(org.paidAt)}
          </div>
          {org.authOrganizationId && (
            <p className="mt-1 text-xs text-green-700">
              Gekoppeld aan organisatie {org.authOrganizationId.slice(0, 8)}...
            </p>
          )}
        </div>
      ) : org.paymentLinkUrl ? (
        <div
          className="rounded-lg border p-4"
          style={{ background: "#FFFBEB", borderColor: "#FCD34D" }}
        >
          <div className="flex items-center gap-2 font-bold text-yellow-800">
            <Clock className="size-4" />
            Betaal-link verzonden op {fmtDate(org.paymentLinkSentAt)}
          </div>
          <a
            href={org.paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs underline"
          >
            Open Mollie checkout
          </a>
        </div>
      ) : (
        <div
          className="rounded-lg border p-4 text-xs text-[color:var(--text-muted)]"
          style={{ borderColor: "var(--border)" }}
        >
          Nog geen betaal-link verzonden.
        </div>
      )}

      <div
        className="rounded-lg border bg-white p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <h4 className="text-xs font-bold text-[color:var(--navy)]">Deal-info</h4>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <dt className="text-[color:var(--text-muted)]">Seats</dt>
          <dd>{org.proposedSeats ?? "—"}</dd>
          <dt className="text-[color:var(--text-muted)]">Bedrag</dt>
          <dd className="font-semibold">{fmtCents(org.proposedAmountCents)}</dd>
          <dt className="text-[color:var(--text-muted)]">Plan</dt>
          <dd>{org.proposedPlanSlug ?? "—"}</dd>
          <dt className="text-[color:var(--text-muted)]">Kortingscode</dt>
          <dd>{org.discountCode ?? "—"}</dd>
        </dl>
        <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
          Vul deze velden aan in de Details-tab voor je een betaal-link verstuurt.
        </p>
      </div>

      <div className="space-y-2">
        {!org.paidAt && !org.paymentLinkUrl && (
          <button
            type="button"
            onClick={sendPaymentLink}
            disabled={sending || !org.proposedSeats || !org.proposedPlanSlug}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--orange)" }}
          >
            <Send className="size-4" />
            {sending ? "Verzenden..." : "Stuur betaal-link"}
          </button>
        )}
        {!org.paidAt && org.paymentLinkUrl && (
          <button
            type="button"
            onClick={resendPaymentLink}
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
          >
            <Mail className="size-4" />
            {sending ? "..." : "Verstuur opnieuw"}
          </button>
        )}
        {!org.paidAt && (
          <button
            type="button"
            onClick={markPaidOffline}
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <CreditCard className="size-4" />
            Markeer offline betaald
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg border p-2 text-xs"
          style={{ background: "#FEE2E2", borderColor: "#FCA5A5", color: "#991B1B" }}
        >
          {error}
        </div>
      )}

      {!org.proposedPlanSlug && !org.paidAt && (
        <div
          className="rounded-lg border p-3 text-xs"
          style={{ background: "#FFF7ED", borderColor: "#FDBA74", color: "#9A3412" }}
        >
          Vul eerst een <strong>plan-slug</strong> (bv. <code>org-yearly</code>)
          en <strong>seats</strong> in op de Details-tab voor je een betaal-link
          kan versturen.
        </div>
      )}
    </div>
  );
}

// ───── Timeline tab ─────

function TimelineTab({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
        Nog geen activiteit.
      </p>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      {events.map((e) => (
        <div
          key={e.id}
          className="rounded-lg border bg-white p-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[color:var(--navy)]">
              {labelForKind(e.kind)}
            </span>
            <span className="text-[color:var(--text-muted)]">
              {fmtDate(e.createdAt, true)}
            </span>
          </div>
          {e.actorName && (
            <div className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
              door {e.actorName}
            </div>
          )}
          {e.payload && Object.keys(e.payload).length > 0 && (
            <pre className="mt-2 overflow-x-auto rounded bg-[color:var(--bg)] p-2 text-[10px]">
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function labelForKind(kind: string): string {
  const map: Record<string, string> = {
    created: "Aangemaakt",
    status_changed: "Status gewijzigd",
    field_updated: "Veld bijgewerkt",
    contact_added: "Contact toegevoegd",
    contact_removed: "Contact verwijderd",
    email_sent: "E-mail verzonden",
    email_opened: "E-mail geopend",
    email_clicked: "Link geklikt",
    email_bounced: "E-mail teruggekomen",
    payment_link_generated: "Betaal-link aangemaakt",
    payment_link_sent: "Betaal-link verstuurd",
    payment_link_resent: "Betaal-link opnieuw verstuurd",
    payment_received: "Betaling ontvangen",
    marked_paid_offline: "Handmatig betaald",
    auth_org_created: "Organisatie aangemaakt",
    consumer_sub_canceled: "Consumer-abonnement gestopt",
    note_added: "Notitie toegevoegd",
    task_added: "Taak toegevoegd",
    task_completed: "Taak afgerond",
  };
  return map[kind] ?? kind;
}

// ───── Tasks tab ─────

function TasksTab({
  orgId,
  tasks,
  onChanged,
}: {
  orgId: string;
  tasks: Task[];
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("follow_up");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function addTask() {
    if (!title) return;
    setSaving(true);
    await fetch(`/api/admin/crm/organizations/${orgId}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        kind,
        dueAt: dueAt || null,
      }),
    });
    setTitle("");
    setDueAt("");
    setSaving(false);
    onChanged();
  }

  async function completeTask(id: string) {
    await fetch(`/api/admin/crm/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    onChanged();
  }

  const open = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);

  return (
    <div className="space-y-3 text-sm">
      <div
        className="rounded-lg border bg-white p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="space-y-2">
          <TextField label="Titel" value={title} onChange={setTitle} />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold">Soort</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="follow_up">Opvolgen</option>
                <option value="email">E-mail</option>
                <option value="phone">Bellen</option>
                <option value="demo">Demo</option>
                <option value="other">Anders</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold">Datum</span>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={addTask}
            disabled={saving || !title}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: "var(--orange)" }}
          >
            Taak toevoegen
          </button>
        </div>
      </div>

      {open.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold text-[color:var(--navy)]">Open</h4>
          {open.map((t) => (
            <div
              key={t.id}
              className="mb-2 flex items-center justify-between rounded-lg border bg-white p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {t.kind} {t.dueAt && `· ${fmtDate(t.dueAt)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => completeTask(t.id)}
                className="rounded-md border bg-white p-1.5 hover:bg-[color:var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                <Check className="size-4" strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold text-[color:var(--text-muted)]">
            Afgerond
          </h4>
          {done.map((t) => (
            <div
              key={t.id}
              className="mb-2 rounded-lg border bg-white p-3 opacity-60"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="text-sm line-through">{t.title}</div>
              <div className="text-xs text-[color:var(--text-muted)]">
                Klaar op {fmtDate(t.completedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───── Helpers ─────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="space-y-2 rounded-lg border bg-white p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <h4 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        {title}
      </h4>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[color:var(--text)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[color:var(--text)]">
        {label}
      </span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}
