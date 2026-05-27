"use client";

// Dicteren.ai — Consent React context
//
// Bron van waarheid voor cookie-consent in de marketing-site. Root layout
// wrapt alles met <ConsentProvider>. Componenten gebruiken useConsent()
// voor read + actions.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { pushConsentUpdate } from "./google-consent-mode";
import { readConsent, writeConsent } from "./storage";
import {
  ALL_GRANTED,
  DEFAULT_DENIED,
  type ConsentRecord,
  type ConsentState,
} from "./types";

type ConsentContextValue = {
  /** Huidige consent-state. Begint als DEFAULT_DENIED tot user keuze maakt. */
  state: ConsentState;
  /** True als gebruiker een keuze heeft gemaakt (banner verbergen). */
  hasDecided: boolean;
  /** Decision timestamp of null. */
  decidedAt: string | null;
  /** Banner-zichtbaarheid override (na intrekken / wijzigen). */
  isBannerOpen: boolean;
  /** Preferences-modal zichtbaarheid. */
  isModalOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  saveCustom: (state: ConsentState) => void;
  openModal: () => void;
  closeModal: () => void;
  reopenBanner: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isBannerOpen, setBannerOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  // Hydratatie: lees localStorage, toon banner als er geen record is.
  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      setRecord(existing);
      // Sync Google Consent Mode bij elke hydratatie zodat na refresh
      // de state alsnog overeenkomt met laatste keuze.
      pushConsentUpdate(existing.state);
    } else {
      setBannerOpen(true);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((state: ConsentState) => {
    const next = writeConsent(state);
    setRecord(next);
    setBannerOpen(false);
    setModalOpen(false);
    pushConsentUpdate(state);
  }, []);

  const acceptAll = useCallback(() => persist(ALL_GRANTED), [persist]);
  const rejectAll = useCallback(() => persist(DEFAULT_DENIED), [persist]);
  const saveCustom = useCallback(
    (state: ConsentState) => persist({ ...state, necessary: true }),
    [persist],
  );
  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const reopenBanner = useCallback(() => {
    setBannerOpen(true);
    setModalOpen(true);
  }, []);

  const value: ConsentContextValue = {
    state: record?.state ?? DEFAULT_DENIED,
    hasDecided: record !== null,
    decidedAt: record?.decidedAt ?? null,
    isBannerOpen: hydrated && isBannerOpen,
    isModalOpen,
    acceptAll,
    rejectAll,
    saveCustom,
    openModal,
    closeModal,
    reopenBanner,
  };

  return <ConsentContext value={value}>{children}</ConsentContext>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within <ConsentProvider>");
  }
  return ctx;
}
