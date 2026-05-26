"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreateUserModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "account_manager" | "admin">(
    "account_manager",
  );
  const [grantLifetime, setGrantLifetime] = useState(true);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    userId: string;
    email: string;
    role: string;
    grantedLicense: string | null;
    mailSent: boolean;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          grantLifetime,
          sendWelcomeEmail,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmaken mislukt.");
        setSubmitting(false);
        return;
      }
      setResult(data);
      setSubmitting(false);
    } catch {
      setError("Netwerkprobleem.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-xl font-bold">Nieuwe user toevoegen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Voor personeel: account-managers en admins die voor Dicteren.ai
          werken. De gebruiker krijgt een welkomstmail met een set-password
          link en de admin-URL.
        </p>

        {result ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-semibold uppercase text-green-800">
              User aangemaakt
            </div>
            <div className="mt-2 text-lg font-bold text-green-900">
              {result.email} ({result.role})
            </div>
            <ul className="mt-3 grid gap-1 text-sm text-green-800">
              <li>
                ✓ Email geverifieerd (admin-toegevoegd)
              </li>
              {result.grantedLicense && (
                <li>
                  ✓ Lifetime license:{" "}
                  <span className="font-mono">{result.grantedLicense}</span>
                </li>
              )}
              <li>
                {result.mailSent
                  ? "✓ Welkomstmail verstuurd"
                  : "⚠️ Welkomstmail niet verstuurd (zie /admin/emails)"}
              </li>
            </ul>
            <div className="mt-4 flex justify-end">
              <button onClick={onCreated} className="btn btn-primary">
                Klaar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-semibold">Naam</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Voor- en achternaam"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold">Werkmail</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="naam@dicteren.ai"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold">Rol</span>
              <select
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as
                      | "user"
                      | "account_manager"
                      | "admin",
                  )
                }
                className="input"
              >
                <option value="account_manager">Account Manager</option>
                <option value="admin">Admin (volledige rechten)</option>
                <option value="user">Gewone gebruiker</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={grantLifetime}
                onChange={(e) => setGrantLifetime(e.target.checked)}
              />
              Geef ook lifetime access (persoonlijk gebruik desktop-app)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
              />
              Stuur welkomstmail met set-password-link
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Aanmaken…" : "User aanmaken"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
