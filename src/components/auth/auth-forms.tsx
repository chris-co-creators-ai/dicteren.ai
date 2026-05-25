"use client";

// Dicteren.ai — eigen auth-forms voor Better Auth (self-hosted)
// Vervangt @neondatabase/auth-ui AuthView. Alle copy in NL, branding mee.
//
// Paden afgehandeld: sign-in, sign-up, forgot-password, reset-password.
// Andere paden (callback, verify, accept-invitation) krijgen eigen pagina's
// of vallen terug op de catch-all.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Path =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

export function AuthForms({
  path,
  redirectTo,
}: {
  path: string;
  redirectTo: string;
}) {
  if (path === "sign-in") return <SignInForm redirectTo={redirectTo} />;
  if (path === "sign-up") return <SignUpForm redirectTo={redirectTo} />;
  if (path === "forgot-password") return <ForgotPasswordForm />;
  if (path === "reset-password") return <ResetPasswordForm />;
  // Onbekend pad — toon link naar sign-in als veilige fallback.
  return (
    <p className="text-sm text-[color:var(--text-muted)]">
      Onbekend authenticatie-pad. Ga naar{" "}
      <a href="/auth/sign-in" className="font-semibold underline">
        inloggen
      </a>
      .
    </p>
  );
}

// ───── Sign in ───────────────────────────────────────────────

function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setError(translateError(error.code, error.message));
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="email"
        label="E-mailadres"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={setEmail}
      />
      <Field
        id="password"
        label="Wachtwoord"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <SubmitButton pending={isPending}>Inloggen</SubmitButton>
    </form>
  );
}

// ───── Sign up ───────────────────────────────────────────────

function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email,
        password,
      });
      if (error) {
        setError(translateError(error.code, error.message));
        return;
      }
      // autoSignIn=true in server-config zorgt voor directe sessie
      router.replace(redirectTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="name"
        label="Naam"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={setName}
      />
      <Field
        id="email"
        label="E-mailadres"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={setEmail}
      />
      <Field
        id="password"
        label="Wachtwoord"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={setPassword}
        hint="Minimaal 8 tekens."
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <SubmitButton pending={isPending}>Account aanmaken</SubmitButton>
    </form>
  );
}

// ───── Forgot password ───────────────────────────────────────

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });
      // Privacy: ook bij niet-bestaand e-mailadres tonen we succes.
      if (error && error.code !== "USER_NOT_FOUND") {
        setError(translateError(error.code, error.message));
        return;
      }
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-5 text-sm">
        <p className="font-semibold text-[color:var(--navy)]">
          Check je inbox
        </p>
        <p className="mt-1.5 text-[color:var(--text-muted)]">
          Als er een account bij dit e-mailadres bestaat, hebben we een
          herstel-link gestuurd. De link werkt 1 uur.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="email"
        label="E-mailadres"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={setEmail}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <SubmitButton pending={isPending}>Verstuur herstel-link</SubmitButton>
    </form>
  );
}

// ───── Reset password ────────────────────────────────────────

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg)] p-5 text-sm">
        <p className="font-semibold text-[color:var(--navy)]">Geen token</p>
        <p className="mt-1.5 text-[color:var(--text-muted)]">
          Deze pagina is alleen bereikbaar via de link uit je herstel-mail.{" "}
          <a href="/auth/forgot-password" className="font-semibold underline">
            Vraag een nieuwe link aan
          </a>
          .
        </p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (password !== confirm) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    startTransition(async () => {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        setError(translateError(error.code, error.message));
        return;
      }
      router.replace("/auth/sign-in?reset=ok");
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="password"
        label="Nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={setPassword}
        hint="Minimaal 8 tekens."
      />
      <Field
        id="confirm"
        label="Herhaal wachtwoord"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={setConfirm}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <SubmitButton pending={isPending}>Sla nieuw wachtwoord op</SubmitButton>
    </form>
  );
}

// ───── Shared UI ─────────────────────────────────────────────

function Field({
  id,
  label,
  type,
  autoComplete,
  required,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-[color:var(--text)]"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[color:var(--border-soft)] bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[color:var(--orange)] focus:ring-2 focus:ring-[color:var(--orange-50)]"
      />
      {hint && (
        <p className="text-[0.6875rem] text-[color:var(--text-soft)]">
          {hint}
        </p>
      )}
    </div>
  );
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary mt-1 w-full justify-center"
    >
      {pending && <Loader2 className="size-3.5 animate-spin" strokeWidth={2.2} />}
      {children}
    </button>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
    >
      {children}
    </p>
  );
}

// Vertaalt Better Auth error-codes naar NL. Onbekende code → fallback msg.
function translateError(code?: string, fallback?: string): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "E-mailadres of wachtwoord klopt niet.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Er bestaat al een account met dit e-mailadres.";
    case "INVALID_EMAIL":
      return "Vul een geldig e-mailadres in.";
    case "PASSWORD_TOO_SHORT":
      return "Wachtwoord moet minimaal 8 tekens zijn.";
    case "INVALID_TOKEN":
    case "RESET_PASSWORD_TOKEN_EXPIRED":
      return "Deze herstel-link is verlopen of ongeldig. Vraag een nieuwe aan.";
    case "EMAIL_NOT_VERIFIED":
      return "Bevestig eerst je e-mailadres via de mail die we je stuurden.";
    case "BANNED_USER":
      return "Dit account is geblokkeerd. Neem contact op met support.";
    default:
      return fallback ?? "Er ging iets mis. Probeer het opnieuw.";
  }
}
