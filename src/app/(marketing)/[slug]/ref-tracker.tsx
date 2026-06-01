"use client";

import { useEffect } from "react";

/** Zet de first-touch affiliate-cookie via de route-handler. Client-side omdat
 *  Next 16 cookies().set() niet toestaat tijdens een page-render. */
export function RefTracker({ affiliateId }: { affiliateId: string }) {
  useEffect(() => {
    fetch("/api/affiliate-ref", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ affiliateId, source: "slug" }),
      keepalive: true,
    }).catch(() => {});
  }, [affiliateId]);
  return null;
}
