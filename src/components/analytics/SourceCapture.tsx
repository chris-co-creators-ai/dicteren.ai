"use client";

// Dicteren.ai — gclid/UTM-capture voor campagne-attributie.
//
// Vangt gclid + utm_* van de landings-URL in-memory (geen opslag, dus
// ePrivacy-proof vóór consent) en schrijft ze pas naar een first-party
// cookie (dai_attrib, 90 dagen) zodra de bezoeker marketing-consent geeft.
// Nieuwe campagne-parameters overschrijven de cookie (laatste klik wint,
// zoals Google Ads attribueert). De cookie is de bron voor de latere
// offline-conversion-upload (gclid → trial → betaald) en de
// customerSource-koppeling. Mount binnen <ConsentProvider> (marketing-layout).
//
// Zonder gclid/utm in de URL doet dit component niets.

import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent/ConsentProvider";

const COOKIE_NAME = "dai_attrib";
const MAX_AGE_DAYS = 90;
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type Attrib = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  gclid?: string;
  landing?: string;
  ts?: string;
};

function readParamsFromUrl(): Attrib | null {
  const params = new URLSearchParams(window.location.search);
  const out: Attrib = {};
  const gclid = params.get("gclid");
  if (gclid) out.gclid = gclid;
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  if (!out.gclid && !UTM_KEYS.some((k) => out[k])) return null;
  out.landing = window.location.pathname;
  out.ts = new Date().toISOString();
  return out;
}

function writeAttribCookie(attrib: Attrib): void {
  const value = encodeURIComponent(JSON.stringify(attrib));
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

export function SourceCapture() {
  const { state, hasDecided } = useConsent();
  // In-memory vangen vóór er een consent-keuze is — de URL-parameters zijn
  // alleen op de landing aanwezig en de banner staat op datzelfde moment open.
  const captured = useRef<Attrib | null>(null);
  const written = useRef(false);

  // Eén keer vangen op mount is genoeg; SPA-navigaties binnen de site dragen
  // de campagne-parameters toch niet opnieuw.
  useEffect(() => {
    if (captured.current === null) {
      captured.current = readParamsFromUrl() ?? {};
    }
  }, []);

  useEffect(() => {
    if (written.current) return;
    if (!hasDecided || !state.marketing) return;
    const attrib = captured.current;
    if (!attrib || (!attrib.gclid && !UTM_KEYS.some((k) => attrib[k]))) return;
    writeAttribCookie(attrib);
    written.current = true;
  }, [hasDecided, state.marketing]);

  return null;
}
