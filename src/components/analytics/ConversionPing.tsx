"use client";

// Dicteren.ai — vuurt één Google Ads-conversie op mount.
//
// Server-pages (trial-succes, checkout-succes) renderen dit alleen op het
// echte conversie-moment (verse trial / betaalde order). Google dedupliceert
// op transaction_id, dus een refresh telt niet dubbel. Zonder env-config is
// het een no-op (zie lib/tracking/googleAds.ts).

import { useEffect, useRef } from "react";
import {
  trackTrialConversion,
  trackPurchaseConversion,
} from "@/lib/tracking/googleAds";

type Props =
  | { type: "trial"; transactionId: string; valueEur?: never; currency?: never }
  | { type: "purchase"; transactionId: string; valueEur: number; currency?: string };

export function ConversionPing(props: Props) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (props.type === "trial") {
      trackTrialConversion(props.transactionId);
    } else {
      trackPurchaseConversion({
        valueEur: props.valueEur,
        currency: props.currency,
        transactionId: props.transactionId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
