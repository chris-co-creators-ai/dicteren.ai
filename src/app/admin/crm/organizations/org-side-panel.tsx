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
import { LogInteractionSheet } from "../log-activity-sheet";
import {
  activityTypeLabel,
  outcomeLabel,
  directionLabel,
  type ActivityType,
  type ActivityDirection,
} from "@/lib/config/crmActivity";
import { NL_PROVINCES } from "@/lib/services/nlProvinces";
import { toast } from "sonner";

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
  houseNumber: string | null;
  city: string | null;
  province: string | null;
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
  industry: string | null;
  callScript: string | null;
  resellerNotes: string | null;
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
  { key: "belscript", label: "Belscript" },
  { key: "faq", label: "FAQ" },
  { key: "contacts", label: "Contacten" },
  { key: "payment", label: "Betaling" },
  { key: "reseller", label: "Reseller" },
  { key: "timeline", label: "Timeline" },
  { key: "tasks", label: "Taken" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Props = {
  orgId: string;
  admins: Admin[];
  onClose: () => void;
  onChanged: () => void;
  /** Docked = altijd-zichtbaar in de Personen-tab (geen modal/backdrop). */
  docked?: boolean;
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
  docked = false,
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
      return;
    }
    const data = await res.json().catch(() => null);
    // FSM-gate of andere serverfout → toon de reden, herlaad de echte staat.
    toast.error(data?.message ?? "Wijziging niet opgeslagen");
    await loadAll();
  }

  const panel = (
      <div
        onClick={docked ? undefined : (e) => e.stopPropagation()}
        className={
          docked
            ? "flex h-full w-full flex-col bg-white"
            : "ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
        }
      >
        {/* Header — vast bovenin */}
        <div
          className="shrink-0 border-b bg-white px-4 py-2.5"
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
          <div className="mt-2.5 flex gap-1 overflow-x-auto">
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

        {/* Body — Details regelt z'n eigen scroll + vaste Opslaan-voet;
            de overige tabs scrollen in dit middenvlak */}
        {loading || !org ? (
          <div className="flex-1 px-4 py-12 text-center text-sm text-[color:var(--text-muted)]">
            Laden...
          </div>
        ) : tab === "details" ? (
          <DetailsTab org={org} admins={admins} onSave={patchOrg} />
        ) : (
          <div className="scroll-visible min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {tab === "belscript" ? (
              <BelscriptTab org={org} onSave={patchOrg} />
            ) : tab === "faq" ? (
              <FaqTab />
            ) : tab === "reseller" ? (
              <ResellerTab org={org} onSave={patchOrg} />
            ) : tab === "contacts" ? (
              <ContactsTab
                orgId={orgId}
                contacts={contacts}
                onChanged={loadAll}
              />
            ) : tab === "payment" ? (
              <PaymentTab org={org} onChanged={loadAll} />
            ) : tab === "timeline" ? (
              <TimelineTab
                events={events}
                orgId={orgId}
                orgName={org.name}
                onLogged={loadAll}
              />
            ) : (
              <TasksTab orgId={orgId} tasks={tasks} onChanged={loadAll} />
            )}
          </div>
        )}
      </div>
  );

  if (docked) return panel;
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      {panel}
    </div>
  );
}

// ───── Belscript / FAQ / Reseller tabs ─────

function BelscriptTab({
  org,
  onSave,
}: {
  org: Org;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [script, setScript] = useState(org.callScript ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setScript(org.callScript ?? ""), [org.callScript]);

  function template(): string {
    const naam = org.name ?? "het bedrijf";
    const branche = org.industry ?? "jullie branche";
    return [
      `BELSCRIPT — ${naam}`,
      "",
      "1. Opening",
      `Hoi, je spreekt met [jouw naam] van Dicteren.ai. Bel ik gelegen?`,
      "",
      "2. Aanleiding",
      `Een paar kantoren in ${branche} gebruiken Dicteren.ai al om dossiers in te spreken in plaats van te typen. Scheelt zo'n 30 minuten per dag per persoon.`,
      "",
      "3. Behoefte peilen",
      "- Hoeveel tijd zijn jullie kwijt aan typen/verslaglegging?",
      "- Wie zou het gebruiken? Hoeveel mensen?",
      "- In welk programma werken jullie (zaaksysteem/EPD/Word)?",
      "",
      "4. Kernpunten",
      "- Werkt lokaal op de eigen computer; wij zien de tekst nooit.",
      "- Typt in elk programma waar je kunt typen.",
      "- Direct live: code plakken, klaar. Geen IT nodig.",
      "",
      "5. Bezwaren — zie FAQ-tab",
      "",
      "6. Afsluiting / next step",
      "Zullen we een korte demo van 15 minuten inplannen op jullie eigen laptop?",
    ].join("\n");
  }

  async function save() {
    setSaving(true);
    try {
      await onSave({ callScript: script });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[color:var(--navy)]">
          Belscript
        </h3>
        <button
          type="button"
          onClick={() => setScript(template())}
          className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-[color:var(--navy)] hover:bg-[color:var(--bg)]"
          style={{ borderColor: "var(--border)" }}
        >
          Genereer standaard script
        </button>
      </div>
      <p className="text-xs text-[color:var(--text-muted)]">
        Lees op tijdens het bellen, pas aan naar deze klant. Wordt per
        organisatie bewaard.
      </p>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        rows={20}
        placeholder="Schrijf of genereer een belscript voor deze organisatie..."
        className="w-full rounded-lg border bg-white p-3 text-sm leading-relaxed outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "#FF8441" }}
      >
        {saving ? "Opslaan..." : "Script opslaan"}
      </button>
    </div>
  );
}

const STANDARD_FAQ: { q: string; a: string }[] = [
  {
    q: "Werkt het echt lokaal? Wat gebeurt er met onze data?",
    a: "Ja. De spraakherkenning draait op de computer zelf. Wij krijgen je tekst of audio nooit te zien, alleen factuurgegevens.",
  },
  {
    q: "Werkt het in onze software (zaaksysteem / EPD)?",
    a: "Dicteren.ai typt in elk programma waar je kunt typen: Word, Outlook, je browser, je zaaksysteem. Sneltoets indrukken, spreken, de tekst verschijnt waar je cursor staat.",
  },
  {
    q: "Wat kost het?",
    a: "Persoonlijk vanaf 12 euro per maand of 96 euro per jaar. Zakelijk vanaf 120 euro per seat per jaar, met staffelkorting vanaf 5 seats.",
  },
  {
    q: "Werkt het met dialect?",
    a: "Het werkt op standaard-Nederlands en lichte accenten. Sterke dialecten (Brabants, Limburgs, Fries) worden minder goed herkend.",
  },
  {
    q: "Hoe snel zijn we live?",
    a: "Direct. Download de app, plak de licentiecode, klaar. Geen installatie door IT nodig.",
  },
  {
    q: "Kunnen we het eerst proberen?",
    a: "Ja, 14 dagen gratis, geen creditcard nodig.",
  },
];

type CustomFaq = {
  id: string;
  question: string;
  answer: string;
  createdByName: string | null;
};

function FaqTab() {
  const [items, setItems] = useState<CustomFaq[]>([]);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/crm/faq");
    const data = await res.json().catch(() => null);
    if (data?.success) setItems(data.items);
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!q.trim() || !a.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/admin/crm/faq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, answer: a }),
      });
      setQ("");
      setA("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/crm/faq/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-bold text-[color:var(--navy)]">
          Standaardvragen
        </h3>
        <div className="space-y-2">
          {STANDARD_FAQ.map((f, i) => (
            <details
              key={i}
              className="rounded-lg border bg-white p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <summary className="cursor-pointer text-sm font-semibold">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-[color:var(--navy)]">
          Eigen vragen ({items.length})
        </h3>
        <div className="space-y-2">
          {items.map((f) => (
            <details
              key={f.id}
              className="group rounded-lg border bg-white p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
                <span>{f.question}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    void remove(f.id);
                  }}
                  className="shrink-0 text-xs text-[color:var(--red)] opacity-0 hover:underline group-hover:opacity-100"
                >
                  verwijderen
                </button>
              </summary>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                {f.answer}
              </p>
              {f.createdByName && (
                <p className="mt-1 text-[0.625rem] text-[color:var(--text-soft)]">
                  toegevoegd door {f.createdByName}
                </p>
              )}
            </details>
          ))}
        </div>
      </div>

      <div
        className="space-y-2 rounded-lg border bg-[color:var(--bg)] p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <h4 className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
          Eigen vraag toevoegen
        </h4>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Vraag van de klant"
          className="w-full rounded-md border bg-white px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <textarea
          value={a}
          onChange={(e) => setA(e.target.value)}
          rows={3}
          placeholder="Jouw antwoord"
          className="w-full rounded-md border bg-white px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="button"
          onClick={add}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "var(--navy)" }}
        >
          {saving ? "Opslaan..." : "Toevoegen"}
        </button>
      </div>
    </div>
  );
}

function ResellerTab({
  org,
  onSave,
}: {
  org: Org;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [notes, setNotes] = useState(org.resellerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  useEffect(() => setNotes(org.resellerNotes ?? ""), [org.resellerNotes]);

  async function save() {
    setSaving(true);
    try {
      await onSave({ resellerNotes: notes });
    } finally {
      setSaving(false);
    }
  }

  async function requestBrandIdentity() {
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch(
        `/api/admin/crm/organizations/${org.id}/brand-identity-request`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => null);
      setSendMsg(
        res.ok && data?.success
          ? `Verzoek verstuurd naar ${data.sentTo}. De partner reageert op jouw mail.`
          : data?.error ?? "Versturen mislukt",
      );
    } catch (e) {
      setSendMsg((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="space-y-2 rounded-lg border bg-[color:var(--bg)] p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <h4 className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
          Partnership opstarten
        </h4>
        <p className="text-xs text-[color:var(--text-muted)]">
          Stuur het primaire contact een verzoek om hun brand-identity (logo,
          lettertype, hex-codes, teamfoto's, korte omschrijving). De partner
          reageert rechtstreeks op jouw mail met de bestanden.
        </p>
        <button
          type="button"
          onClick={requestBrandIdentity}
          disabled={sending}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "var(--navy)" }}
        >
          {sending ? "Versturen..." : "Brand-identity opvragen"}
        </button>
        {sendMsg && (
          <p className="text-xs font-medium text-[color:var(--navy)]">{sendMsg}</p>
        )}
      </div>

      <h3 className="text-sm font-bold text-[color:var(--navy)]">
        Reseller-notities
      </h3>
      <p className="text-xs text-[color:var(--text-muted)]">
        Afspraken en context over de reseller die deze deal aanbracht
        (commissie, kortingscode, contactpersoon).
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={14}
        placeholder="Notities over de reseller-relatie..."
        className="w-full rounded-lg border bg-white p-3 text-sm leading-relaxed outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "#FF8441" }}
      >
        {saving ? "Opslaan..." : "Notities opslaan"}
      </button>
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
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  // PDOK-lookup: postcode + huisnummer → straat/plaats/provincie auto-invullen.
  async function runAddressLookup() {
    if (!f.postalCode || !f.houseNumber) {
      setLookupMsg("Vul postcode + huisnummer in");
      return;
    }
    setLookingUp(true);
    setLookupMsg(null);
    try {
      const res = await fetch(
        `/api/admin/crm/address-lookup?postcode=${encodeURIComponent(f.postalCode)}&huisnummer=${encodeURIComponent(f.houseNumber)}`,
      );
      const data = await res.json();
      if (!data.success) {
        setLookupMsg(data.error ?? "Geen adres gevonden");
        return;
      }
      const a = data.address;
      setF((prev) => ({
        ...prev,
        addressLine1:
          a.street && a.houseNumber ? `${a.street} ${a.houseNumber}` : prev.addressLine1,
        postalCode: a.postalCode ?? prev.postalCode,
        city: a.city ?? prev.city,
        province: a.province ?? prev.province,
      }));
      setLookupMsg(`✓ ${a.displayName ?? "adres gevonden"}`);
    } catch {
      setLookupMsg("Adres-service niet bereikbaar");
    } finally {
      setLookingUp(false);
    }
  }

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
      houseNumber: f.houseNumber,
      city: f.city,
      province: f.province,
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-visible min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
      <Section title="Bedrijf">
        <TextField label="Naam" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="KvK" value={f.kvk ?? ""} onChange={(v) => setF({ ...f, kvk: v })} />
          <TextField label="BTW-nummer" value={f.vatNumber ?? ""} onChange={(v) => setF({ ...f, vatNumber: v })} />
        </div>
        <TextField label="Website" value={f.website ?? ""} onChange={(v) => setF({ ...f, website: v })} />
      </Section>

      <Section title="Adres">
        {/* Postcode + huisnummer → automatisch adres via PDOK (gratis, NL-overheid) */}
        <div className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <TextField label="Postcode" value={f.postalCode ?? ""} onChange={(v) => setF({ ...f, postalCode: v })} />
            <TextField label="Huisnr." value={f.houseNumber ?? ""} onChange={(v) => setF({ ...f, houseNumber: v })} />
          </div>
          <button
            type="button"
            onClick={runAddressLookup}
            disabled={lookingUp}
            className="mb-0.5 shrink-0 rounded-lg bg-[color:var(--navy)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {lookingUp ? "Zoeken…" : "Adres ophalen"}
          </button>
        </div>
        {lookupMsg && (
          <p className="text-[0.6875rem] text-[color:var(--text-muted)]">{lookupMsg}</p>
        )}
        <TextField label="Straat + nummer" value={f.addressLine1 ?? ""} onChange={(v) => setF({ ...f, addressLine1: v })} />
        <TextField label="Adres extra" value={f.addressLine2 ?? ""} onChange={(v) => setF({ ...f, addressLine2: v })} />
        <div className="grid grid-cols-3 gap-2">
          <TextField label="Plaats" value={f.city ?? ""} onChange={(v) => setF({ ...f, city: v })} />
          <label className="block">
            <span className="text-xs font-semibold">Provincie</span>
            <select
              value={f.province ?? ""}
              onChange={(e) => setF({ ...f, province: e.target.value || null })}
              className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="">—</option>
              {NL_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Land" value={f.countryCode ?? "NL"} onChange={(v) => setF({ ...f, countryCode: v })} />
        </div>
      </Section>

      <Section title="Pijplijn">
        <label className="block">
          <span className="text-xs font-semibold">Owner</span>
          <select
            value={f.accountOwnerId ?? ""}
            onChange={(e) => setF({ ...f, accountOwnerId: e.target.value || null })}
            className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
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
            className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
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
      </div>

      {/* Vaste voet — Opslaan altijd zichtbaar, ongeacht scrollpositie */}
      <div className="shrink-0 border-t bg-white px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#FF8441" }}
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
    <div className="space-y-2 text-sm">
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
                    style={{ background: "#FF8441" }}
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
              style={{ background: "#FF8441" }}
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

// Deelbare 14-dagen zakelijke-trial-link. De AM kopieert 'm en stuurt 'm naar
// een prospect of reseller; die vult zelf bedrijfsgegevens in en de lead landt
// bij deze AM (am=accountOwnerId). reseller=1 zet de bron op reseller.
function TrialLinkShare({
  amUserId,
  orgId,
}: {
  amUserId: string | null;
  orgId: string;
}) {
  const [reseller, setReseller] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mailBusy, setMailBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState<string | null>(null);

  async function mailToContact() {
    setMailBusy(true);
    setMailMsg(null);
    try {
      const res = await fetch(
        `/api/admin/crm/organizations/${orgId}/trial-link`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reseller }),
        },
      );
      const data = await res.json().catch(() => ({}));
      setMailMsg(
        res.ok && data.success
          ? `Trial-link gemaild naar ${data.to}.`
          : data.error ?? "Mailen mislukt",
      );
    } catch (e) {
      setMailMsg((e as Error).message);
    } finally {
      setMailBusy(false);
    }
  }
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.dicteren.ai";
  const link =
    `${origin}/zakelijk/trial` +
    (amUserId ? `?am=${amUserId}` : "") +
    (reseller ? `${amUserId ? "&" : "?"}reseller=1` : "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard kan geblokkeerd zijn — gebruiker selecteert handmatig */
    }
  }

  return (
    <div
      className="rounded-lg border bg-white p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <h4 className="text-xs font-bold text-[color:var(--navy)]">
        14-dagen trial-link delen
      </h4>
      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
        Stuur naar een prospect of reseller. Ze vullen zelf hun
        bedrijfsgegevens in en testen direct — de lead komt bij jou in het CRM.
      </p>
      <label className="mt-2 flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={reseller}
          onChange={(e) => setReseller(e.target.checked)}
        />
        Voor een reseller
      </label>
      <div className="mt-2 flex gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border bg-[color:var(--bg)] px-2 py-1.5 text-xs"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "var(--navy)" }}
        >
          {copied ? "Gekopieerd" : "Kopieer"}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={mailToContact}
          disabled={mailBusy}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#FF8441" }}
        >
          {mailBusy ? "Mailen…" : "Mail naar primair contact"}
        </button>
        {mailMsg && (
          <span className="text-xs text-[color:var(--text-muted)]">{mailMsg}</span>
        )}
      </div>
    </div>
  );
}

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
    <div className="space-y-2.5 text-sm">
      <TrialLinkShare amUserId={org.accountOwnerId} orgId={org.id} />
      {org.paidAt ? (
        <div
          className="rounded-lg border p-3"
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
          className="rounded-lg border p-3"
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
          className="rounded-lg border p-3 text-xs text-[color:var(--text-muted)]"
          style={{ borderColor: "var(--border)" }}
        >
          Nog geen betaal-link verzonden.
        </div>
      )}

      <div
        className="rounded-lg border bg-white p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <h4 className="text-xs font-bold text-[color:var(--navy)]">Deal-info</h4>
        <dl className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
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
            style={{ background: "#FF8441" }}
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

function TimelineTab({
  events,
  orgId,
  orgName,
  onLogged,
}: {
  events: TimelineEvent[];
  orgId: string;
  orgName: string;
  onLogged: () => void;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-end">
        <LogInteractionSheet
          orgId={orgId}
          orgName={orgName}
          onLogged={onLogged}
        />
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
          Nog geen activiteit. Log de eerste interactie.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((e) =>
            e.kind === "interaction_logged" ? (
              <InteractionRow key={e.id} event={e} />
            ) : (
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
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// Een handmatig gelogde interactie (kind="interaction_logged"): type + richting
// + resultaat uit de payload, leesbaar weergegeven met het label uit de SSOT.
function InteractionRow({ event }: { event: TimelineEvent }) {
  const p = (event.payload ?? {}) as {
    type?: string;
    direction?: string;
    outcome?: string | null;
    note?: string | null;
    occurredAt?: string | null;
  };
  const type = p.type as ActivityType | undefined;
  return (
    <div
      className="rounded-lg border bg-white p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[color:var(--navy)]">
          {type ? activityTypeLabel(type) : "Interactie"}
          {p.direction
            ? ` · ${directionLabel(p.direction as ActivityDirection)}`
            : ""}
        </span>
        <span className="text-[color:var(--text-muted)]">
          {fmtDate(p.occurredAt ?? event.createdAt, true)}
        </span>
      </div>
      {type && p.outcome && (
        <span
          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: "color-mix(in srgb, var(--aqua) 18%, white)",
            color: "var(--navy)",
          }}
        >
          {outcomeLabel(type, p.outcome)}
        </span>
      )}
      {p.note && <div className="mt-1.5 text-sm">{p.note}</div>}
      {event.actorName && (
        <div className="mt-1 text-[10px] text-[color:var(--text-muted)]">
          door {event.actorName}
        </div>
      )}
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
    <div className="space-y-2 text-sm">
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
                className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
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
                className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={addTask}
            disabled={saving || !title}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: "#FF8441" }}
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
      className="space-y-1.5 rounded-lg border bg-white p-2.5"
      style={{ borderColor: "var(--border)" }}
    >
      <h4 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
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
        className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
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
        className="mt-0.5 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}
