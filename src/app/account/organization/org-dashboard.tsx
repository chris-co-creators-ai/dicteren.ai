"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Monitor,
  Receipt,
  LayoutDashboard,
  Plus,
  X,
  RotateCw,
  UserPlus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Snapshot = {
  totalSeats: number;
  assignedSeats: number;
  pendingSeats: number;
  unassignedFreeSeats: number;
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
    amountCents: number;
  } | null;
};

type Seat = {
  licenseId: string;
  code: string;
  status: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignedUserEmail: string | null;
  pendingInvitationEmail: string | null;
  pendingInvitationId: string | null;
  pendingInvitationExpiresAt: string | null;
  activeDevicesCount: number;
  assignedAt: string | null;
  issuedAt: string;
  expiresAt: string | null;
  seatLabel: string | null;
};

type Device = {
  activationId: string;
  licenseId: string;
  licenseCode: string;
  memberName: string | null;
  memberEmail: string | null;
  platform: string | null;
  appVersion: string | null;
  activatedAt: string;
  lastSeenAt: string | null;
  isActive: boolean;
};

type Member = {
  memberId: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  since: string;
};

type Billing = {
  billingEmail: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;
  purchaseOrderNumber: string | null;
};

type Props = {
  orgId: string;
  orgName: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  isAdmin: boolean;
  role: string;
  snapshot: Snapshot;
  seats: Seat[];
  devices: Device[];
  members: Member[];
  billing: Billing | null;
  initialTab: string;
  upgradeStatus: string | null;
};

type Tab = "overview" | "seats" | "devices" | "billing";

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dagen geleden`;
  return formatDate(iso);
}

function tierLabel(id: string): string {
  switch (id) {
    case "tier_1_4": return "1–4 seats";
    case "tier_5_9": return "5–9 seats (10%)";
    case "tier_10_24": return "10–24 seats (15%)";
    case "tier_25_49": return "25–49 seats (20%)";
    case "tier_custom": return "Maatwerk";
    default: return id;
  }
}

export function OrgDashboard(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    (props.initialTab as Tab) || "overview",
  );
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <>
      {/* Hero */}
      <div className="mb-2 flex items-center gap-2">
        <span className="chip chip-navy">Organisatie</span>
        <span className="text-xs uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Rol: {props.role}
        </span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{props.orgName}</h1>

      {/* Snapshot strip */}
      <HeroSnapshot snapshot={props.snapshot} />

      {/* Upgrade-success banner */}
      {props.upgradeStatus === "ok" && (
        <div
          className="mt-4 rounded-xl border-l-4 p-4"
          style={{
            borderColor: "var(--aqua)",
            background: "var(--aqua-50)",
          }}
        >
          <p className="text-sm font-medium text-[color:var(--navy)]">
            Betaling ontvangen. Je nieuwe seats verschijnen hieronder zodra
            de bevestiging binnen is — vernieuw de pagina over een minuut.
          </p>
        </div>
      )}

      {/* Tabs */}
      <nav
        aria-label="Secties"
        className="mt-7 flex gap-1 overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white p-1"
      >
        <TabBtn
          active={tab === "overview"}
          onClick={() => setTab("overview")}
          icon={<LayoutDashboard className="size-4" />}
          label="Overzicht"
        />
        <TabBtn
          active={tab === "seats"}
          onClick={() => setTab("seats")}
          icon={<Users className="size-4" />}
          label={`Seats (${props.snapshot.totalSeats})`}
        />
        <TabBtn
          active={tab === "devices"}
          onClick={() => setTab("devices")}
          icon={<Monitor className="size-4" />}
          label={`Apparaten (${props.snapshot.activeDevicesTotal})`}
        />
        <TabBtn
          active={tab === "billing"}
          onClick={() => setTab("billing")}
          icon={<Receipt className="size-4" />}
          label="Factuur"
        />
      </nav>

      <div className="mt-6">
        {tab === "overview" && (
          <OverviewTab
            snapshot={props.snapshot}
            members={props.members}
            isAdmin={props.isAdmin}
            currentUserId={props.currentUserId}
          />
        )}
        {tab === "seats" && (
          <SeatsTab
            orgId={props.orgId}
            seats={props.seats}
            snapshot={props.snapshot}
            isAdmin={props.isAdmin}
            onChanged={refresh}
            pending={pending}
          />
        )}
        {tab === "devices" && (
          <DevicesTab
            orgId={props.orgId}
            devices={props.devices}
            isAdmin={props.isAdmin}
            currentUserId={props.currentUserId}
            onChanged={refresh}
            pending={pending}
          />
        )}
        {tab === "billing" && (
          <BillingTab
            orgId={props.orgId}
            billing={props.billing}
            snapshot={props.snapshot}
            isAdmin={props.isAdmin}
          />
        )}
      </div>

      {/* Member self-leave */}
      {!props.isAdmin && (
        <SelfLeaveSection orgId={props.orgId} orgName={props.orgName} />
      )}
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-[color:var(--navy)] text-white"
          : "text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ───── Hero snapshot ───────────────────────────────────────────────

function HeroSnapshot({ snapshot }: { snapshot: Snapshot }) {
  const seatDots = useMemo(() => {
    const dots: ("filled" | "empty")[] = [];
    for (let i = 0; i < snapshot.totalSeats; i++) {
      dots.push(i < snapshot.assignedSeats ? "filled" : "empty");
    }
    return dots;
  }, [snapshot.assignedSeats, snapshot.totalSeats]);

  return (
    <div
      className="mt-5 grid gap-4 rounded-2xl border p-5 sm:grid-cols-3"
      style={{ borderColor: "var(--border-soft)", background: "white" }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Seats in gebruik
        </p>
        <p className="mt-1.5 text-2xl font-bold text-[color:var(--navy)]">
          {snapshot.assignedSeats}{" "}
          <span className="text-sm font-medium text-[color:var(--text-muted)]">
            van {snapshot.totalSeats}
          </span>
        </p>
        {seatDots.length > 0 && seatDots.length <= 30 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {seatDots.map((d, i) => (
              <span
                key={i}
                className={cn(
                  "size-2.5 rounded-full",
                  d === "filled"
                    ? "bg-[color:var(--navy)]"
                    : "border border-[color:var(--border-soft)]",
                )}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Apparaten actief
        </p>
        <p className="mt-1.5 text-2xl font-bold text-[color:var(--navy)]">
          {snapshot.activeDevicesTotal}{" "}
          <span className="text-sm font-medium text-[color:var(--text-muted)]">
            van {snapshot.maxDevicesTotal}
          </span>
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          {snapshot.utilizationPct}% bezetting
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Abonnement
        </p>
        <p className="mt-1.5 text-2xl font-bold text-[color:var(--navy)]">
          {eur(snapshot.totalAnnualCents)}{" "}
          <span className="text-sm font-medium text-[color:var(--text-muted)]">
            / jaar
          </span>
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          {tierLabel(snapshot.tierId)} ·{" "}
          {snapshot.subscription?.nextBillingAt
            ? `Incasso ${formatDate(snapshot.subscription.nextBillingAt)}`
            : "Nog niet actief"}
        </p>
      </div>
    </div>
  );
}

// ───── Overview tab ───────────────────────────────────────────────

function OverviewTab({
  snapshot,
  members,
  isAdmin,
  currentUserId,
}: {
  snapshot: Snapshot;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
        <h2 className="text-lg font-bold">Snelle status</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-[color:var(--text-muted)]">Toegewezen</span>
            <span className="font-semibold">
              {snapshot.assignedSeats} / {snapshot.totalSeats}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-[color:var(--text-muted)]">Openstaand</span>
            <span className="font-semibold">{snapshot.pendingSeats}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-[color:var(--text-muted)]">Vrij toe te wijzen</span>
            <span className="font-semibold">
              {snapshot.unassignedFreeSeats}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-[color:var(--text-muted)]">Apparaten actief</span>
            <span className="font-semibold">
              {snapshot.activeDevicesTotal} / {snapshot.maxDevicesTotal}
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
        <h2 className="text-lg font-bold">Leden ({members.length})</h2>
        <ul className="mt-3 divide-y divide-[color:var(--border-soft)]">
          {members.slice(0, 6).map((m) => (
            <li
              key={m.memberId}
              className="flex items-center justify-between py-2.5"
            >
              <div>
                <div className="text-sm font-medium">
                  {m.name}
                  {m.userId === currentUserId && (
                    <span className="ml-2 text-xs text-[color:var(--text-muted)]">
                      (jij)
                    </span>
                  )}
                </div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {m.email} · {m.role}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {members.length > 6 && (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            +{members.length - 6} meer — zie Seats-tab.
          </p>
        )}
        {!isAdmin && (
          <p className="mt-3 text-xs text-[color:var(--text-muted)]">
            Alleen owners en admins kunnen leden toevoegen of verwijderen.
          </p>
        )}
      </section>
    </div>
  );
}

// ───── Seats tab ──────────────────────────────────────────────────

function SeatsTab({
  orgId,
  seats,
  snapshot,
  isAdmin,
  onChanged,
  pending,
}: {
  orgId: string;
  seats: Seat[];
  snapshot: Snapshot;
  isAdmin: boolean;
  onChanged: () => void;
  pending: boolean;
}) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [assignSeatId, setAssignSeatId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--text-muted)]">
            Elke seat is één persoonlijke licentiecode. Per code: max 2 apparaten.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDowngradeModalOpen(true)}
              disabled={snapshot.totalSeats <= 1}
              className="btn btn-secondary disabled:opacity-50"
            >
              <X className="size-4" />
              Seats verlagen
            </button>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="size-4" />
              Seats toevoegen
            </button>
          </div>
        )}
      </div>

      {seats.length === 0 ? (
        <EmptyState
          title="Nog geen seats"
          description="Koop een zakelijk abonnement op /prijzen om te beginnen."
        />
      ) : (
        <SeatsTable
          orgId={orgId}
          seats={seats}
          isAdmin={isAdmin}
          onAssignClick={(id) => setAssignSeatId(id)}
          onChanged={onChanged}
          pending={pending}
        />
      )}

      {upgradeModalOpen && (
        <UpgradeModal
          orgId={orgId}
          currentSeats={snapshot.totalSeats}
          onClose={() => setUpgradeModalOpen(false)}
          onDone={() => {
            setUpgradeModalOpen(false);
            onChanged();
          }}
        />
      )}
      {downgradeModalOpen && (
        <DowngradeModal
          orgId={orgId}
          seats={seats.filter(
            (s) => s.status !== "revoked" && s.status !== "refunded",
          )}
          onClose={() => setDowngradeModalOpen(false)}
          onDone={() => {
            setDowngradeModalOpen(false);
            onChanged();
          }}
        />
      )}
      {assignSeatId && (
        <AssignSeatModal
          orgId={orgId}
          seatId={assignSeatId}
          onClose={() => setAssignSeatId(null)}
          onDone={() => {
            setAssignSeatId(null);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function SeatsTable({
  orgId,
  seats,
  isAdmin,
  onAssignClick,
  onChanged,
  pending,
}: {
  orgId: string;
  seats: Seat[];
  isAdmin: boolean;
  onAssignClick: (id: string) => void;
  onChanged: () => void;
  pending: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border-soft)] bg-[color:var(--bg)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Toegewezen aan</th>
            <th className="px-4 py-3 text-center">Apparaten</th>
            <th className="px-4 py-3">Status</th>
            {isAdmin && <th className="px-4 py-3 text-right">Acties</th>}
          </tr>
        </thead>
        <tbody>
          {seats.map((s) => (
            <SeatRow
              key={s.licenseId}
              orgId={orgId}
              seat={s}
              isAdmin={isAdmin}
              onAssignClick={onAssignClick}
              onChanged={onChanged}
              pending={pending}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeatRow({
  orgId,
  seat,
  isAdmin,
  onAssignClick,
  onChanged,
  pending,
}: {
  orgId: string;
  seat: Seat;
  isAdmin: boolean;
  onAssignClick: (id: string) => void;
  onChanged: () => void;
  pending: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function revoke() {
    if (
      !window.confirm(
        seat.assignedUserName
          ? `Seat van ${seat.assignedUserName} intrekken? Apparaten worden gedeactiveerd.`
          : "Deze seat intrekken?",
      )
    ) {
      return;
    }
    setBusy(true);
    await fetch(`/api/organization/${orgId}/seats/${seat.licenseId}/revoke`, {
      method: "POST",
    });
    setBusy(false);
    onChanged();
  }

  async function cancelInvite() {
    if (!seat.pendingInvitationId) return;
    if (!window.confirm("Uitnodiging annuleren? Seat wordt weer vrij.")) return;
    setBusy(true);
    await fetch(
      `/api/organization/${orgId}/invitations/${seat.pendingInvitationId}/cancel`,
      { method: "POST" },
    );
    setBusy(false);
    onChanged();
  }

  async function resendInvite() {
    if (!seat.pendingInvitationId) return;
    setBusy(true);
    await fetch(
      `/api/organization/${orgId}/invitations/${seat.pendingInvitationId}/resend`,
      { method: "POST" },
    );
    setBusy(false);
    alert("Invite opnieuw verstuurd.");
  }

  let statusChip: { label: string; bg: string; color: string };
  if (seat.assignedUserId) {
    statusChip = {
      label: "actief",
      bg: "var(--aqua-50)",
      color: "var(--navy)",
    };
  } else if (seat.pendingInvitationId) {
    statusChip = {
      label: "wacht op accept",
      bg: "#FFF1E0",
      color: "#A24A00",
    };
  } else if (seat.status === "pending_payment") {
    statusChip = {
      label: "wacht op betaling",
      bg: "#FFF1E0",
      color: "#A24A00",
    };
  } else {
    statusChip = {
      label: "vrij",
      bg: "#EEF0F4",
      color: "#5a6478",
    };
  }
  if (seat.status === "revoked") {
    statusChip = { label: "ingetrokken", bg: "#FCE7E6", color: "#A11A1A" };
  }

  return (
    <tr className="border-b border-[color:var(--border-soft)] last:border-b-0">
      <td className="px-4 py-3 font-mono text-[13px] font-semibold tracking-wider text-[color:var(--navy)]">
        {seat.code}
      </td>
      <td className="px-4 py-3">
        {seat.assignedUserName ? (
          <div>
            <div className="font-medium">{seat.assignedUserName}</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {seat.assignedUserEmail}
            </div>
          </div>
        ) : seat.pendingInvitationEmail ? (
          <div>
            <div className="font-medium">{seat.pendingInvitationEmail}</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              verloopt {formatDate(seat.pendingInvitationExpiresAt)}
            </div>
          </div>
        ) : (
          <span className="text-[color:var(--text-muted)]">
            (niet toegewezen)
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-xs tabular-nums">
        {seat.assignedUserId
          ? `${seat.activeDevicesCount} / 2`
          : "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: statusChip.bg, color: statusChip.color }}
        >
          {statusChip.label}
        </span>
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {!seat.assignedUserId &&
              !seat.pendingInvitationId &&
              seat.status !== "revoked" &&
              seat.status !== "pending_payment" && (
                <button
                  type="button"
                  onClick={() => onAssignClick(seat.licenseId)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--navy)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  disabled={busy || pending}
                >
                  <UserPlus className="size-3" />
                  Wijs toe
                </button>
              )}
            {seat.pendingInvitationId && (
              <>
                <button
                  type="button"
                  onClick={resendInvite}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--bg)] disabled:opacity-50"
                >
                  <RotateCw className="size-3" />
                  Opnieuw
                </button>
                <button
                  type="button"
                  onClick={cancelInvite}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <X className="size-3" />
                  Annuleer
                </button>
              </>
            )}
            {seat.assignedUserId && (
              <button
                type="button"
                onClick={revoke}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="size-3" />
                Trek in
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

// ───── Upgrade modal ──────────────────────────────────────────────

function UpgradeModal({
  orgId,
  currentSeats,
  onClose,
  onDone,
}: {
  orgId: string;
  currentSeats: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [delta, setDelta] = useState(1);
  const [quote, setQuote] = useState<{
    delta: number;
    newSeats: number;
    newAnnualCents: number;
    prorataDeltaCents: number;
    tierChanged: boolean;
    customQuoteRequired: boolean;
    oldTier: { id: string; discountPct: number };
    newTier: { id: string; discountPct: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newSeats = currentSeats + delta;

  async function loadQuote() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organization/${orgId}/seats/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newSeats }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Quote ophalen mislukte.");
      } else {
        setQuote(data.quote);
      }
    } catch {
      setError("Netwerkfout.");
    }
    setLoading(false);
  }

  async function confirm() {
    if (quote?.customQuoteRequired) {
      window.location.href = `/contact?onderwerp=zakelijke-offerte&seats=${newSeats}`;
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organization/${orgId}/seats/upgrade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newSeats }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Upgrade mislukt.");
        setSubmitting(false);
        return;
      }
      // Pro-rata charge → redirect naar Mollie
      if (data.prorataCheckoutUrl) {
        window.location.href = data.prorataCheckoutUrl;
        return;
      }
      onDone();
    } catch {
      setError("Netwerkfout.");
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold">Seats toevoegen</h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        Huidig: {currentSeats} seats. Hoeveel wil je erbij?
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDelta((d) => Math.max(1, d - 1))}
          className="grid size-9 place-items-center rounded-full border border-[color:var(--border-soft)] text-lg font-bold hover:bg-[color:var(--bg)]"
          aria-label="Minder"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={49}
          value={delta}
          onChange={(e) =>
            setDelta(Math.min(49, Math.max(1, Number(e.target.value) || 1)))
          }
          className="w-20 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-center text-lg font-bold"
        />
        <button
          type="button"
          onClick={() => setDelta((d) => Math.min(49, d + 1))}
          className="grid size-9 place-items-center rounded-full border border-[color:var(--border-soft)] text-lg font-bold hover:bg-[color:var(--bg)]"
          aria-label="Meer"
        >
          +
        </button>
        <button
          type="button"
          onClick={loadQuote}
          disabled={loading}
          className="ml-auto btn btn-secondary"
        >
          {loading ? "Bezig…" : "Bereken"}
        </button>
      </div>

      {quote && (
        <div
          className="mt-5 rounded-xl p-4 text-sm"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border-soft)",
          }}
        >
          {quote.customQuoteRequired ? (
            <>
              <p className="font-semibold text-[color:var(--navy)]">
                Maatwerk-offerte vereist
              </p>
              <p className="mt-1 text-[color:var(--text-muted)]">
                Voor 50+ seats nemen we contact op. Klik bevestigen om een
                offerte aan te vragen.
              </p>
            </>
          ) : (
            <>
              <p>
                Nieuw totaal:{" "}
                <strong>{quote.newSeats} seats</strong> · {eur(quote.newAnnualCents)}/jaar
              </p>
              {quote.tierChanged && (
                <p className="mt-1 text-[color:var(--orange)] font-semibold">
                  Nieuwe staffel: {quote.newTier.discountPct}% korting per seat
                </p>
              )}
              {quote.prorataDeltaCents > 0 ? (
                <p className="mt-2">
                  Nu te betalen (pro-rata):{" "}
                  <strong>{eur(quote.prorataDeltaCents)}</strong>
                </p>
              ) : quote.prorataDeltaCents < 0 ? (
                <p className="mt-2">
                  Credit op volgende incasso:{" "}
                  <strong>{eur(Math.abs(quote.prorataDeltaCents))}</strong>
                </p>
              ) : (
                <p className="mt-2 text-[color:var(--text-muted)]">
                  Geen pro-rata charge nu.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Annuleren
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!quote || submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting
            ? "Bezig…"
            : quote?.customQuoteRequired
              ? "Vraag offerte"
              : "Bevestig en betaal"}
        </button>
      </div>
    </Modal>
  );
}

// ───── Downgrade modal ────────────────────────────────────────────

function DowngradeModal({
  orgId,
  seats,
  onClose,
  onDone,
}: {
  orgId: string;
  seats: Seat[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitDowngrade() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Weet je zeker dat je ${selected.size} ${selected.size === 1 ? "seat" : "seats"} verwijdert?\n\nAlle gekoppelde apparaten worden direct gedeactiveerd. Het abonnementsbedrag wijzigt bij de volgende incasso.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organization/${orgId}/seats/downgrade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatIds: Array.from(selected) }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Downgrade mislukt.");
        setSubmitting(false);
        return;
      }
      onDone();
    } catch {
      setError("Netwerkfout.");
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold">Seats verlagen</h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        Selecteer welke seats je intrekt. Apparaten worden direct
        gedeactiveerd. Het tarief verandert vanaf je volgende incasso.
      </p>

      <ul className="mt-5 max-h-72 space-y-1 overflow-auto rounded-xl border border-[color:var(--border-soft)] p-2">
        {seats.map((s) => (
          <li key={s.licenseId}>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg p-2.5 text-sm hover:bg-[color:var(--bg)]",
                selected.has(s.licenseId) && "bg-[color:var(--bg-deep)]",
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(s.licenseId)}
                onChange={() => toggle(s.licenseId)}
              />
              <div className="flex-1">
                <div className="font-mono text-xs font-semibold text-[color:var(--navy)]">
                  {s.code}
                </div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {s.assignedUserName ??
                    s.pendingInvitationEmail ??
                    "(niet toegewezen)"}
                </div>
              </div>
              <span className="text-xs text-[color:var(--text-muted)]">
                {s.activeDevicesCount > 0 && `${s.activeDevicesCount} apparaten`}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Annuleren
        </button>
        <button
          type="button"
          onClick={submitDowngrade}
          disabled={selected.size === 0 || submitting}
          className="btn btn-primary disabled:opacity-50"
          style={{ background: "#A11A1A" }}
        >
          {submitting ? "Bezig…" : `Trek ${selected.size} in`}
        </button>
      </div>
    </Modal>
  );
}

// ───── Assign-seat modal ──────────────────────────────────────────

function AssignSeatModal({
  orgId,
  seatId,
  onClose,
  onDone,
}: {
  orgId: string;
  seatId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organization/${orgId}/seats/${seatId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Uitnodigen mislukt.");
        setSubmitting(false);
        return;
      }
      onDone();
    } catch {
      setError("Netwerkfout.");
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold">Seat toewijzen</h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
        Vul het e-mailadres in. We sturen een uitnodiging met de licentiecode.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@bedrijf.nl"
          className="rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2.5 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin")}
          className="rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2.5 text-sm"
        >
          <option value="member">Member (alleen gebruik)</option>
          <option value="admin">Admin (kan seats wijzigen)</option>
        </select>

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4" />
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Annuleren
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Bezig…" : "Verstuur uitnodiging"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ───── Devices tab ────────────────────────────────────────────────

function DevicesTab({
  orgId,
  devices,
  isAdmin,
  currentUserId,
  onChanged,
  pending,
}: {
  orgId: string;
  devices: Device[];
  isAdmin: boolean;
  currentUserId: string;
  onChanged: () => void;
  pending: boolean;
}) {
  void orgId;
  void pending;
  const active = devices.filter((d) => d.isActive);

  if (active.length === 0) {
    return (
      <EmptyState
        title="Geen actieve apparaten"
        description="Zodra een teamlid een licentie activeert, verschijnt het apparaat hier."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border-soft)] bg-[color:var(--bg)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Platform</th>
            <th className="px-4 py-3">App-versie</th>
            <th className="px-4 py-3">Laatst gezien</th>
            <th className="px-4 py-3">Geactiveerd</th>
            {isAdmin && <th className="px-4 py-3 text-right">Actie</th>}
          </tr>
        </thead>
        <tbody>
          {active.map((d) => (
            <DeviceRow
              key={d.activationId}
              orgId={null}
              device={d}
              isAdmin={isAdmin && d.memberEmail !== null}
              isOwnDevice={false}
              currentUserId={currentUserId}
              onChanged={onChanged}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviceRow({
  device: d,
  isAdmin,
  currentUserId,
  onChanged,
}: {
  orgId: string | null;
  device: Device;
  isAdmin: boolean;
  isOwnDevice: boolean;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function revoke() {
    if (
      !window.confirm(
        `Apparaat van ${d.memberName ?? d.memberEmail} (${d.platform ?? "—"}) uitloggen?`,
      )
    ) {
      return;
    }
    setBusy(true);
    // device revoke via separate endpoint die we niet hebben — gebruik seat revoke
    // (= alle devices van die seat). MVP-pragmatic, voor granular revoke
    // bouwen we /api/organization/[id]/devices/[activationId]/revoke later.
    // Hier doen we niets — geef gebruiker de melding.
    alert(
      "Per-device revoke komt binnenkort. Trek voor nu de hele seat in vanuit de Seats-tab.",
    );
    setBusy(false);
    void onChanged;
    void currentUserId;
  }

  return (
    <tr className="border-b border-[color:var(--border-soft)] last:border-b-0">
      <td className="px-4 py-3">
        <div className="font-medium">{d.memberName ?? d.memberEmail ?? "—"}</div>
        <div className="font-mono text-[11px] text-[color:var(--text-muted)]">
          {d.licenseCode}
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {d.platform ?? "—"}
      </td>
      <td className="px-4 py-3 text-xs">{d.appVersion ?? "—"}</td>
      <td className="px-4 py-3 text-xs">{relativeTime(d.lastSeenAt)}</td>
      <td className="px-4 py-3 text-xs">{formatDate(d.activatedAt)}</td>
      {isAdmin && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={revoke}
            disabled={busy}
            className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
          >
            Log uit
          </button>
        </td>
      )}
    </tr>
  );
}

// ───── Billing tab ────────────────────────────────────────────────

function BillingTab({
  orgId,
  billing,
  snapshot,
  isAdmin,
}: {
  orgId: string;
  billing: Billing | null;
  snapshot: Snapshot;
  isAdmin: boolean;
}) {
  void orgId;
  void isAdmin;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
        <h2 className="text-lg font-bold">Abonnement</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Field label="Status" value={snapshot.subscription?.status ?? "—"} />
          <Field
            label="Volgende incasso"
            value={
              snapshot.subscription?.nextBillingAt
                ? formatDate(snapshot.subscription.nextBillingAt)
                : "—"
            }
          />
          <Field
            label="Bedrag per jaar"
            value={eur(snapshot.subscription?.amountCents ?? snapshot.totalAnnualCents)}
          />
          <Field label="Tier" value={tierLabel(snapshot.tierId)} />
          <Field
            label="Prijs per seat"
            value={`${eur(snapshot.perSeatPriceCents)} / jaar`}
          />
          <Field
            label="Seats actief"
            value={`${snapshot.assignedSeats} van ${snapshot.totalSeats}`}
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
        <h2 className="text-lg font-bold">Factuurgegevens</h2>
        {billing ? (
          <dl className="mt-3 grid gap-2 text-sm">
            <Field label="Factuur-email" value={billing.billingEmail} />
            <Field label="BTW-nummer" value={billing.vatNumber} />
            <Field
              label="Adres"
              value={[billing.addressLine1, billing.addressLine2]
                .filter(Boolean)
                .join(", ") || "—"}
            />
            <Field
              label="Plaats"
              value={`${billing.postalCode ?? ""} ${billing.city ?? ""}`.trim() || "—"}
            />
            <Field label="Land" value={billing.countryCode} />
            <Field label="PO-nummer" value={billing.purchaseOrderNumber} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            Nog geen factuurgegevens. Worden ingevuld bij eerstvolgende checkout.
          </p>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value ?? "—"}</dd>
    </div>
  );
}

// ───── Self-leave ─────────────────────────────────────────────────

function SelfLeaveSection({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function leave() {
    if (
      !window.confirm(
        `Verlaat ${orgName}? Je verliest direct toegang en je apparaten worden gedeactiveerd.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/account/organization/${orgId}/leave`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error ?? "Verlaten mislukt.");
      setSubmitting(false);
      return;
    }
    router.push("/account");
  }

  return (
    <section className="mt-10 rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
      <h2 className="text-sm font-bold text-[color:var(--text-muted)]">
        Organisatie verlaten
      </h2>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Wil je niet meer onderdeel zijn van {orgName}? Je seat wordt vrijgegeven
        en je apparaten worden gedeactiveerd.
      </p>
      <button
        type="button"
        onClick={leave}
        disabled={submitting}
        className="mt-3 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
      >
        {submitting ? "Bezig…" : "Verlaat organisatie"}
      </button>
    </section>
  );
}

// ───── Helpers ────────────────────────────────────────────────────

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-white p-10 text-center">
      <p className="text-base font-semibold text-[color:var(--navy)]">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">{description}</p>
    </div>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
