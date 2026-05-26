"use client";

// Client-side verify-email handler. Roept Better Auth's API aan met
// credentials: "include" zodat de session-cookie netjes door de browser
// gezet wordt. Bij 4xx of network-error redirect naar ?error=expired
// zodat de gebruiker onze eigen "Bevestiging mislukt"-page ziet, niet
// een Next.js 404.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";

export function VerifyClient({
  token,
  callbackURL,
}: {
  token: string;
  callbackURL: string;
}) {
  const [state, setState] = useState<"loading" | "done">("loading");

  useEffect(() => {
    const url = `/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackURL)}`;
    let cancelled = false;

    (async () => {
      try {
        // `redirect: "follow"` is default. Browser volgt 302 van Better
        // Auth en zet de session-cookie zelf. Bij 4xx (token verlopen)
        // krijgen we de error-status terug zonder redirect.
        const res = await fetch(url, {
          credentials: "include",
          redirect: "follow",
        });
        if (cancelled) return;

        if (res.ok || res.redirected) {
          // Verify gelukt. Final URL = waar Better Auth ons heen stuurde,
          // anders de gevraagde callback.
          window.location.replace(res.url || callbackURL);
          return;
        }

        // 4xx van Better Auth = ongeldig of verlopen token.
        window.location.replace("/auth/verify-email?error=expired");
      } catch {
        if (cancelled) return;
        window.location.replace("/auth/verify-email?error=expired");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, callbackURL]);

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 size-[40rem] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, var(--aqua-200), transparent 70%)" }}
      />
      <div
        className="relative w-full max-w-md rounded-3xl border bg-white px-8 py-10 text-center"
        style={{ borderColor: "var(--border-soft)", boxShadow: "var(--shadow-lg)" }}
      >
        <LogoIcon size={56} className="mx-auto" />
        <div className="mx-auto mt-6 grid size-12 place-items-center rounded-full"
          style={{ background: "var(--aqua-200)" }}>
          <Loader2 className="size-6 animate-spin" strokeWidth={2.2} style={{ color: "var(--navy)" }} />
        </div>
        <h1
          className="mt-5 text-2xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          {state === "done" ? "Klaar" : "Bezig met bevestigen"}
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          Een ogenblik. We bevestigen je e-mailadres en sturen je door.
        </p>
        <p className="mt-5 text-xs" style={{ color: "var(--text-soft)" }}>
          Duurt het te lang?{" "}
          <Link href="/auth/sign-in" className="font-semibold underline">
            Naar inloggen
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
