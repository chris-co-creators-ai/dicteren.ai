"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  planSlug: string;
  /** For organization plans: number of seats to buy. */
  quantity?: number;
  organizationName?: string;
  kind: "consumer" | "organization";
  label: string;
  className?: string;
  /** Where to land back after sign-in if user was not authenticated. */
  redirectAfterAuth?: string;
};

export function BuyButton({
  planSlug,
  quantity = 1,
  organizationName,
  kind,
  label,
  className,
  redirectAfterAuth,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function buy() {
    setPending(true);
    try {
      const url =
        kind === "organization"
          ? "/api/checkout/organization"
          : "/api/checkout/consumer";
      const body =
        kind === "organization"
          ? { planSlug, seats: quantity, organizationName }
          : { planSlug };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        toast.error("Log eerst in om te kopen");
        const target = redirectAfterAuth ?? window.location.pathname;
        router.push(
          `/auth/sign-in?redirect=${encodeURIComponent(target)}`,
        );
        return;
      }

      const json = (await res.json()) as
        | { success: true; checkoutUrl: string; orderId: string }
        | { success: false; error: string; code?: string };

      if (!json.success) {
        if (json.code === "CUSTOM_QUOTE_REQUIRED") {
          toast.error(json.error, {
            description: "We mailen je een voorstel — contact@dicteren.ai",
          });
          return;
        }
        toast.error("Kon checkout niet starten", { description: json.error });
        return;
      }

      window.location.href = json.checkoutUrl;
    } catch (err) {
      toast.error("Netwerkfout", { description: (err as Error).message });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={buy}
      disabled={pending}
      className={className}
    >
      {pending ? "Bezig…" : label}
    </button>
  );
}
