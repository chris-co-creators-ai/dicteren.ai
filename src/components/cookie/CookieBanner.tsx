"use client";

// Dicteren.ai — Cookie-banner (rechtsonderin)
//
// Verschijnt bij eerste bezoek + na "reopen". Drie keuzes met gelijke
// prominentie: Accepteer alles / Weiger alles / Voorkeuren. AVG-conform
// (geen pre-selectie boven necessary, reject net zo prominent als accept).
//
// Ursula-foto is een knipoog naar de EU-regelgeving die deze banner
// noodzakelijk maakt.

import Image from "next/image";
import Link from "next/link";
import { useConsent } from "@/lib/consent/ConsentProvider";
import { PreferencesModal } from "./PreferencesModal";

export function CookieBanner() {
  const {
    isBannerOpen,
    isModalOpen,
    acceptAll,
    rejectAll,
    openModal,
    closeModal,
    saveCustom,
    state,
  } = useConsent();

  if (!isBannerOpen && !isModalOpen) return null;

  return (
    <>
      {isBannerOpen && !isModalOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md animate-cookie-banner-in"
        >
          <div
            className="overflow-hidden rounded-2xl border bg-white shadow-2xl"
            style={{
              borderColor: "var(--border-soft)",
              boxShadow:
                "0 20px 60px -10px rgba(4,38,96,0.25), 0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div
              className="relative aspect-[16/9] w-full overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, var(--aqua-50) 0%, #fff5ec 45%, #FFE0C2 100%)",
              }}
            >
              {/* Dicteren.ai gradient als achtergrond. De Ursula-PNG is
                  8-bit RGB zonder alpha-kanaal (witte achtergrond, geen
                  echte transparantie). Met `mix-blend-mode: multiply`
                  rekent CSS `wit × gradient = gradient` af: witte pixels
                  worden vervangen door de gradient, kleurpixels (huid,
                  haar, kleding) blijven intact. */}
              <Image
                src="/ursela_cookie.png"
                alt="Ursula viert dat je over cookies nadenkt"
                fill
                sizes="(max-width: 768px) 100vw, 28rem"
                className="object-contain"
                style={{ mixBlendMode: "multiply" }}
                priority={false}
              />
              <div
                className="absolute inset-x-0 bottom-0 px-4 py-2 text-center text-xs italic"
                style={{
                  color: "var(--navy)",
                  background:
                    "linear-gradient(transparent, rgba(255,255,255,0.75) 70%)",
                }}
              >
                Ursula zou trots zijn 🎉
              </div>
            </div>

            <div className="p-5">
              <h2
                id="cookie-banner-title"
                className="text-base font-bold text-[color:var(--navy)]"
              >
                Cookies & privacy
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
                We gebruiken cookies om de site te laten werken en om — als jij
                dat goed vindt — beter te begrijpen hoe mensen Dicteren.ai
                ontdekken. Jij kiest welke categorieën aan mogen.{" "}
                <Link
                  href="/cookies"
                  className="underline hover:text-[color:var(--navy)]"
                >
                  Lees ons cookie-overzicht
                </Link>
                .
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={rejectAll}
                  className="rounded-lg border border-[color:var(--border-soft)] px-3 py-2.5 text-sm font-semibold text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg)]"
                >
                  Weiger alles
                </button>
                <button
                  type="button"
                  onClick={openModal}
                  className="rounded-lg border border-[color:var(--border-soft)] px-3 py-2.5 text-sm font-semibold text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg)]"
                >
                  Voorkeuren
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--orange)" }}
                >
                  Accepteer alles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PreferencesModal
        open={isModalOpen}
        initial={state}
        onClose={closeModal}
        onSave={saveCustom}
        onAcceptAll={acceptAll}
        onRejectAll={rejectAll}
      />

      <style jsx>{`
        @keyframes cookie-banner-in {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        :global(.animate-cookie-banner-in) {
          animation: cookie-banner-in 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </>
  );
}
