import Link from "next/link";
import { ArrowRight, Laptop } from "lucide-react";
import { listUserDevices, getUserSubscriptionView } from "@/lib/services/account";
import type { KbInteractive } from "@/lib/content/kennisbank/types";
import { KbDisconnectButton } from "./KbDisconnectButton";

const PLATFORM_LABEL: Record<string, string> = {
  "darwin-arm64": "Mac (Apple Silicon)",
  "darwin-x86_64": "Mac (Intel)",
  "windows-x86_64": "Windows",
  "linux-x86_64": "Computer",
  "linux-arm64": "Computer",
};

const STATUS_NL: Record<string, string> = {
  active: "Actief",
  trial: "Proefperiode",
  past_due: "Betaling achter",
  canceled: "Geannuleerd",
  expired: "Verlopen",
  refunded: "Terugbetaald",
  revoked: "Ingetrokken",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft,#f6f7f9)] p-5">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}

// Verrijkt een kennisbank-artikel in het dashboard met de eigen, server-side
// gelezen gegevens van de ingelogde gebruiker. Op de publieke kennisbank wordt
// dit blok nooit getoond.
export async function KbInteractiveBlock({
  type,
  userId,
}: {
  type: KbInteractive;
  userId: string;
}) {
  if (type === "devices") {
    const devices = await listUserDevices(userId);
    return (
      <Frame title="Jouw apparaten">
        {devices.length === 0 ? (
          <p className="text-[15px] text-[color:var(--text-muted)]">
            Je hebt nog geen apparaat geactiveerd.
          </p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li
                key={d.activationId}
                className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-white px-4 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Laptop className="size-5 shrink-0 text-[color:var(--text-muted)]" strokeWidth={2} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[color:var(--navy)]">
                      {PLATFORM_LABEL[d.platform ?? ""] ?? "Computer"}
                    </span>
                    <span className="block text-[13px] text-[color:var(--text-muted)]">
                      Laatst gezien: {fmtDate(d.lastSeenAt)}
                    </span>
                  </span>
                </span>
                <KbDisconnectButton activationId={d.activationId} />
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/account/licenses"
          className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[color:var(--navy)] hover:underline"
        >
          Naar mijn licenties
          <ArrowRight className="size-4" />
        </Link>
      </Frame>
    );
  }

  if (type === "subscription") {
    const view = await getUserSubscriptionView(userId);
    return (
      <Frame title="Jouw abonnement">
        {view.hasLicense && view.license ? (
          <div className="space-y-1 text-[15px]">
            <p className="font-semibold text-[color:var(--navy)]">
              {view.plan?.label ?? "Dicteren.ai"}
            </p>
            <p className="text-[color:var(--text-muted)]">
              Status: {STATUS_NL[view.license.status] ?? view.license.status}
              {view.license.expiresAt
                ? ` · loopt tot ${fmtDate(view.license.expiresAt)}`
                : ""}
            </p>
          </div>
        ) : (
          <p className="text-[15px] text-[color:var(--text-muted)]">
            Je hebt nog geen actief abonnement.
          </p>
        )}
        <Link
          href="/account/billing"
          className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[color:var(--navy)] hover:underline"
        >
          Naar Facturering
          <ArrowRight className="size-4" />
        </Link>
      </Frame>
    );
  }

  // invoices
  return (
    <Frame title="Jouw facturen">
      <p className="text-[15px] text-[color:var(--text-muted)]">
        Al je facturen staan onder Facturering. Open een factuur en klik op
        Download als PDF.
      </p>
      <Link
        href="/account/billing"
        className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[color:var(--navy)] hover:underline"
      >
        Naar Facturering
        <ArrowRight className="size-4" />
      </Link>
    </Frame>
  );
}
