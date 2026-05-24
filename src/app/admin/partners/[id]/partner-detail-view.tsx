"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Save,
  CheckCircle2,
} from "lucide-react";
import {
  issuePartnerCodeAction,
  updatePartnerAction,
  type UpdatePartnerInput,
} from "./actions";

type ActivationStats = {
  totalActivations: number;
  activeNow: number;
  uniqueDevices: number;
  firstActivatedAt: string | null;
  lastActivatedAt: string | null;
  last7Days: number;
  last30Days: number;
  byPlatform: Record<string, number>;
  activationsByDay: { date: string; count: number }[];
  activationLimit: number;
  usagePercentage: number;
};

type Org = Omit<UpdatePartnerInput, "id"> & {
  id: string;
  externalId: string;
  licenseId: string | null;
  createdAt: string;
  updatedAt: string;
};

type License = {
  id: string;
  code: string;
  status: string;
  seats: number;
  maxActivationsPerSeat: number;
  activationCount: number;
  expiresAt: string | null;
  issuedAt: string;
};

type Activation = {
  id: string;
  deviceId: string;
  isActive: boolean;
  activatedAt: string;
  lastTokenIssuedAt: string | null;
};

const OUTREACH_STATUSES = [
  "Nieuw",
  "Benaderd",
  "In gesprek",
  "Akkoord",
  "Live",
  "Afgewezen",
];

const PILOT_STATUSES = [
  "Nog niet gestart",
  "In voorbereiding",
  "Live",
  "Afgerond",
  "Ingetrokken",
];

const PRIORITIES = ["A", "B", "C"];

export function PartnerDetailView({
  org,
  license,
  activations,
  stats,
}: {
  org: Org;
  license: License | null;
  activations: Activation[];
  stats: ActivationStats | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Org>(org);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [seatsInput, setSeatsInput] = useState(
    String(org.freeCodesCount ?? 100),
  );
  const [expiresInput, setExpiresInput] = useState<string>("");
  const [issueError, setIssueError] = useState<string | null>(null);

  const set = <K extends keyof Org>(key: K, value: Org[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    startTransition(async () => {
      const payload: UpdatePartnerInput = { ...form };
      const res = await updatePartnerAction(payload);
      if (res.success) {
        setSavedAt(Date.now());
        router.refresh();
      }
    });
  };

  const handleIssueCode = () => {
    setIssueError(null);
    const seats = Number.parseInt(seatsInput, 10);
    if (!seats || seats < 1) {
      setIssueError("Aantal codes moet groter dan 0 zijn");
      return;
    }
    startTransition(async () => {
      const res = await issuePartnerCodeAction({
        partnerOrgId: form.id,
        seats,
        expiresAt: expiresInput || null,
      });
      if (!res.success) {
        setIssueError(res.error);
        return;
      }
      setIssueOpen(false);
      router.refresh();
    });
  };

  const copyCode = () => {
    if (license) void navigator.clipboard.writeText(license.code);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/admin/partners"
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
      >
        <ArrowLeft className="size-3.5" />
        Terug naar overzicht
      </Link>

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {form.organizationName}
          </h1>
          <p className="mt-1 font-mono text-xs text-[color:var(--text-muted)]">
            {org.externalId}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn btn-primary"
        >
          <Save className="size-3.5" />
          {isPending ? "Opslaan…" : "Wijzigingen opslaan"}
        </button>
      </div>

      {savedAt && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--green-50)] px-2 py-1 text-xs text-[color:var(--green)]">
          <CheckCircle2 className="size-3" />
          Opgeslagen
        </div>
      )}

      {/* Statistics section — alleen tonen als code uitgegeven is */}
      {stats && (
        <Section title="Statistieken">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Activaties totaal" value={String(stats.totalActivations)} accent />
            <Stat label="Nu actief" value={String(stats.activeNow)} />
            <Stat label="Unieke apparaten" value={String(stats.uniqueDevices)} />
            <Stat
              label="Gebruikt van limiet"
              value={`${stats.usagePercentage}%`}
              sublabel={`${stats.totalActivations} / ${stats.activationLimit}`}
            />
            <Stat label="Laatste 7 dagen" value={String(stats.last7Days)} />
            <Stat label="Laatste 30 dagen" value={String(stats.last30Days)} />
            <Stat
              label="Eerste activatie"
              value={
                stats.firstActivatedAt
                  ? new Date(stats.firstActivatedAt).toLocaleDateString("nl-NL")
                  : "—"
              }
            />
            <Stat
              label="Laatste activatie"
              value={
                stats.lastActivatedAt
                  ? new Date(stats.lastActivatedAt).toLocaleDateString("nl-NL")
                  : "—"
              }
            />
          </div>

          {Object.keys(stats.byPlatform).length > 0 && (
            <div className="mt-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Per platform
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {Object.entries(stats.byPlatform).map(([platform, count]) => (
                  <div
                    key={platform}
                    className="rounded-lg border border-[color:var(--border-soft)] px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-[color:var(--text-muted)]">
                      {platform}
                    </span>
                    <span className="ml-2 font-bold text-[color:var(--navy)]">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.activationsByDay.length > 0 && (
            <div className="mt-5">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Activaties per dag — laatste 30 dagen
              </div>
              <BarChart data={stats.activationsByDay} />
            </div>
          )}
        </Section>
      )}

      {/* License section */}
      <Section title="Partnercode">
        {license ? (
          <div className="rounded-lg border border-[color:var(--border-soft)] p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                  Code
                </div>
                <code className="mt-1 block font-mono text-lg font-bold text-[color:var(--navy)]">
                  {license.code}
                </code>
              </div>
              <button
                onClick={copyCode}
                className="btn btn-secondary btn-sm"
              >
                <Copy className="size-3" />
                Kopieer
              </button>
              <div className="ml-auto text-right text-xs text-[color:var(--text-muted)]">
                <div>Status: <strong>{license.status}</strong></div>
                <div>
                  {activations.filter((a) => a.isActive).length} / {license.seats * license.maxActivationsPerSeat} apparaten actief
                </div>
                {license.expiresAt && (
                  <div>Verloopt: {new Date(license.expiresAt).toLocaleDateString("nl-NL")}</div>
                )}
              </div>
            </div>

            {activations.length > 0 && (
              <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                  Activaties
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {activations.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span className="font-mono text-[color:var(--text-muted)]">
                        {a.deviceId.slice(0, 8)}…
                      </span>
                      <span>
                        {a.isActive ? "Actief" : "Inactief"} ·{" "}
                        {new Date(a.activatedAt).toLocaleDateString("nl-NL")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] p-4">
            <p className="text-sm text-[color:var(--text-muted)]">
              Nog geen code uitgegeven. De stichting krijgt één code die alle leden mogen gebruiken.
            </p>
            {!issueOpen ? (
              <button
                onClick={() => setIssueOpen(true)}
                className="btn btn-primary mt-3"
              >
                <KeyRound className="size-3.5" />
                Genereer partnercode
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Aantal codes / apparaten">
                    <input
                      type="number"
                      min={1}
                      value={seatsInput}
                      onChange={(e) => setSeatsInput(e.target.value)}
                      className="dc-input"
                    />
                  </Field>
                  <Field label="Vervaldatum (optioneel)">
                    <input
                      type="date"
                      value={expiresInput}
                      onChange={(e) => setExpiresInput(e.target.value)}
                      className="dc-input"
                    />
                  </Field>
                </div>
                {issueError && (
                  <p className="text-xs text-[color:var(--red)]">{issueError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleIssueCode}
                    disabled={isPending}
                    className="btn btn-primary"
                  >
                    {isPending ? "Bezig…" : "Bevestig & genereer"}
                  </button>
                  <button
                    onClick={() => setIssueOpen(false)}
                    className="btn btn-ghost"
                  >
                    Annuleer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Editable form */}
      <Section title="Organisatie">
        <Grid>
          <Field label="Prioriteit">
            <Select
              value={form.priority ?? ""}
              onChange={(v) => set("priority", v || null)}
              options={["", ...PRIORITIES]}
            />
          </Field>
          <Field label="Segment">
            <input
              type="text"
              value={form.segment ?? ""}
              onChange={(e) => set("segment", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Organisatienaam">
            <input
              type="text"
              value={form.organizationName ?? ""}
              onChange={(e) => set("organizationName", e.target.value)}
              className="dc-input"
              required
            />
          </Field>
          <Field label="Type">
            <input
              type="text"
              value={form.organizationType ?? ""}
              onChange={(e) => set("organizationType", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Beslisser / afdeling" span={2}>
            <input
              type="text"
              value={form.decisionMaker ?? ""}
              onChange={(e) => set("decisionMaker", e.target.value || null)}
              className="dc-input"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Contact">
        <Grid>
          <Field label="Email">
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Telefoon">
            <input
              type="text"
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Adres" span={2}>
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Plaats">
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Contact URL" span={2}>
            <input
              type="url"
              value={form.contactUrl ?? ""}
              onChange={(e) => set("contactUrl", e.target.value || null)}
              className="dc-input"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Inhoudelijk">
        <Grid>
          <Field label="Waarom relevant" span={2}>
            <textarea
              value={form.whyRelevant ?? ""}
              onChange={(e) => set("whyRelevant", e.target.value || null)}
              className="dc-input min-h-[72px]"
              rows={3}
            />
          </Field>
          <Field label="Samenwerkingshoek" span={2}>
            <textarea
              value={form.partnershipAngle ?? ""}
              onChange={(e) => set("partnershipAngle", e.target.value || null)}
              className="dc-input min-h-[72px]"
              rows={3}
            />
          </Field>
          <Field label="Aanbevolen openingszin" span={2}>
            <textarea
              value={form.openingLine ?? ""}
              onChange={(e) => set("openingLine", e.target.value || null)}
              className="dc-input min-h-[60px]"
              rows={2}
            />
          </Field>
          <Field label="Aanbod" span={2}>
            <textarea
              value={form.offer ?? ""}
              onChange={(e) => set("offer", e.target.value || null)}
              className="dc-input min-h-[72px]"
              rows={3}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Outreach">
        <Grid>
          <Field label="Account owner">
            <input
              type="text"
              value={form.accountOwner ?? ""}
              onChange={(e) => set("accountOwner", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Outreach status">
            <Select
              value={form.outreachStatus ?? "Nieuw"}
              onChange={(v) => set("outreachStatus", v)}
              options={OUTREACH_STATUSES}
            />
          </Field>
          <Field label="Laatste contactdatum">
            <input
              type="date"
              value={form.lastContactDate ?? ""}
              onChange={(e) => set("lastContactDate", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Follow-up datum">
            <input
              type="date"
              value={form.followUpDate ?? ""}
              onChange={(e) => set("followUpDate", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Volgende actie" span={2}>
            <input
              type="text"
              value={form.nextAction ?? ""}
              onChange={(e) => set("nextAction", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Reactie samenvatting" span={2}>
            <textarea
              value={form.responseSummary ?? ""}
              onChange={(e) => set("responseSummary", e.target.value || null)}
              className="dc-input min-h-[72px]"
              rows={3}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Pilot">
        <Grid>
          <Field label="Pilot status">
            <Select
              value={form.pilotStatus ?? "Nog niet gestart"}
              onChange={(v) => set("pilotStatus", v)}
              options={PILOT_STATUSES}
            />
          </Field>
          <Field label="Aantal gratis codes (seats)">
            <input
              type="number"
              min={0}
              value={form.freeCodesCount ?? ""}
              onChange={(e) =>
                set("freeCodesCount", e.target.value ? Number(e.target.value) : null)
              }
              className="dc-input"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Bron">
        <Grid>
          <Field label="Bron URL" span={2}>
            <input
              type="url"
              value={form.sourceUrl ?? ""}
              onChange={(e) => set("sourceUrl", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Bronstatus">
            <input
              type="text"
              value={form.sourceStatus ?? ""}
              onChange={(e) => set("sourceStatus", e.target.value || null)}
              className="dc-input"
            />
          </Field>
          <Field label="Bron gecontroleerd op">
            <input
              type="date"
              value={form.sourceVerifiedAt ?? ""}
              onChange={(e) => set("sourceVerifiedAt", e.target.value || null)}
              className="dc-input"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="AVG / notities">
        <Field label="">
          <textarea
            value={form.gdprNotes ?? ""}
            onChange={(e) => set("gdprNotes", e.target.value || null)}
            className="dc-input min-h-[72px]"
            rows={3}
          />
        </Field>
      </Section>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn btn-primary"
        >
          <Save className="size-3.5" />
          {isPending ? "Opslaan…" : "Wijzigingen opslaan"}
        </button>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-[color:var(--border-soft)] bg-white p-5">
      <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : undefined}>
      {label && (
        <label className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="dc-input"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  );
}

function Stat({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-soft)] p-3">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div
        className="mt-1 text-xl font-bold"
        style={{ color: accent ? "var(--orange-600)" : "var(--navy)" }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
          {sublabel}
        </div>
      )}
    </div>
  );
}

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 720;
  const height = 90;
  const barWidth = width / data.length - 2;
  return (
    <div className="mt-2 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ maxHeight: 130 }}
      >
        {data.map((d, i) => {
          const barH = (d.count / max) * height;
          const x = i * (barWidth + 2);
          const y = height - barH;
          const isLast = i === data.length - 1;
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.count}`}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH || 1}
                fill={isLast ? "var(--orange)" : "var(--aqua-300)"}
                rx={2}
              />
              {(i === 0 || i === data.length - 1) && (
                <text
                  x={x + barWidth / 2}
                  y={height + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--text-muted)"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
