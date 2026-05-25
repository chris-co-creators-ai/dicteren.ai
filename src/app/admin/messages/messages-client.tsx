"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Message = {
  id: string;
  kind: string;
  status: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  assignedToUserId: string | null;
  linkedAffiliateId: string | null;
  linkedUserId: string | null;
  adminNotes: string | null;
  createdAt: string;
};

type AdminUser = { id: string; name: string };

const KIND_LABEL: Record<string, string> = {
  general: "Algemeen",
  sales: "Sales",
  support: "Support",
  partnership: "Partnership",
  quote_request: "Offerte",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nieuw",
  in_progress: "Opgepakt",
  closed: "Afgehandeld",
  spam: "Spam",
};

export function MessagesClient({
  messages,
  adminUsers,
}: {
  messages: Message[];
  adminUsers: AdminUser[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Message | null>(null);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.company?.toLowerCase().includes(q) ?? false) ||
          (m.subject?.toLowerCase().includes(q) ?? false) ||
          m.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [messages, kindFilter, statusFilter, search]);

  async function updateMessage(
    id: string,
    patch: Partial<{
      status: string;
      assignedToUserId: string | null;
      adminNotes: string | null;
    }>,
  ) {
    await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    startTransition(() => router.refresh());
    if (selected?.id === id) {
      setSelected({ ...selected, ...patch });
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.2}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek naam, email, bedrijf, inhoud…"
            className="w-full rounded-lg border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-lg border bg-card py-2 px-3 text-sm outline-none"
        >
          <option value="all">Alle types</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-card py-2 px-3 text-sm outline-none"
        >
          <option value="all">Alle statussen</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Van</th>
              <th className="px-4 py-3">Onderwerp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Account-mgr</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Geen berichten in dit filter.
                </td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => setSelected(m)}
              >
                <td className="px-4 py-3 text-xs">
                  {new Date(m.createdAt).toLocaleDateString("nl-NL")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                      m.kind === "partnership"
                        ? "bg-purple-100 text-purple-800"
                        : m.kind === "support"
                          ? "bg-red-100 text-red-800"
                          : m.kind === "sales" || m.kind === "quote_request"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {KIND_LABEL[m.kind] ?? m.kind}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.email}
                    {m.company && ` · ${m.company}`}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {m.subject ?? (
                    <span className="text-muted-foreground line-clamp-1 max-w-[300px]">
                      {m.message.slice(0, 80)}…
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                      m.status === "new"
                        ? "bg-orange-100 text-orange-800"
                        : m.status === "in_progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : m.status === "closed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {m.assignedToUserId
                    ? adminUsers.find((u) => u.id === m.assignedToUserId)?.name ??
                      "—"
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs font-semibold text-blue-600 hover:underline">
                    Open →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <MessageDetail
          message={selected}
          adminUsers={adminUsers}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => updateMessage(selected.id, patch)}
        />
      )}
    </>
  );
}

function MessageDetail({
  message,
  adminUsers,
  onClose,
  onUpdate,
}: {
  message: Message;
  adminUsers: AdminUser[];
  onClose: () => void;
  onUpdate: (
    patch: Partial<{
      status: string;
      assignedToUserId: string | null;
      adminNotes: string | null;
    }>,
  ) => void;
}) {
  const [notes, setNotes] = useState(message.adminNotes ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          ×
        </button>
        <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
          {KIND_LABEL[message.kind]} ·{" "}
          {new Date(message.createdAt).toLocaleString("nl-NL")}
        </div>
        <h2 className="mt-2 text-xl font-bold">
          {message.subject ?? `Bericht van ${message.name}`}
        </h2>
        <div className="mt-2 text-sm">
          <strong>{message.name}</strong> · {message.email}
          {message.company && ` · ${message.company}`}
          {message.phone && ` · ${message.phone}`}
        </div>

        <div className="mt-5 whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm">
          {message.message}
        </div>

        {(message.linkedAffiliateId || message.linkedUserId) && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {message.linkedAffiliateId && (
              <Link
                href={`/admin/affiliates/${message.linkedAffiliateId}`}
                className="rounded-md border bg-purple-50 px-3 py-1.5 font-semibold text-purple-800 hover:bg-purple-100"
              >
                → Naar affiliate
              </Link>
            )}
            {message.linkedUserId && (
              <Link
                href={`/admin/crm/${message.linkedUserId}`}
                className="rounded-md border bg-blue-50 px-3 py-1.5 font-semibold text-blue-800 hover:bg-blue-100"
              >
                → Naar CRM-profiel
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold">Status</span>
            <select
              value={message.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              className="input"
            >
              {Object.entries(STATUS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold">Account-manager</span>
            <select
              value={message.assignedToUserId ?? ""}
              onChange={(e) =>
                onUpdate({
                  assignedToUserId: e.target.value || null,
                })
              }
              className="input"
            >
              <option value="">— Niet toegewezen</option>
              {adminUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 grid gap-1">
          <span className="text-xs font-semibold">Interne notitie</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (message.adminNotes ?? "")) {
                onUpdate({ adminNotes: notes || null });
              }
            }}
            className="input min-h-[80px]"
            placeholder="Sales-context, follow-up reminders, etc."
          />
        </label>
      </div>
    </div>
  );
}
