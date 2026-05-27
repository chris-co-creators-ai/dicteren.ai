"use client";

// Dicteren.ai — Knop die de cookie-banner/modal opnieuw opent.
//
// Voor "Wijzig cookie-voorkeuren" op /cookies en in de footer. Roept
// reopenBanner aan vanuit ConsentProvider.

import { useConsent } from "@/lib/consent/ConsentProvider";

export function CookiePreferencesButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { reopenBanner } = useConsent();
  return (
    <button type="button" onClick={reopenBanner} className={className}>
      {children}
    </button>
  );
}
