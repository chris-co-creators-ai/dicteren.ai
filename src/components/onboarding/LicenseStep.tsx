import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Loader2, KeyRound } from "lucide-react";
import { commands } from "@/bindings";
import DicterenTextLogo from "../icons/DicterenTextLogo";

interface LicenseStepProps {
  onActivated: () => void;
}

/**
 * Auto-format a license code as the user types:
 *  - uppercase
 *  - keep dashes after every 4 chars of payload
 *  - strip everything else
 *  - target shape: DIC-PRO-2026-A1B2-C3D4
 */
function formatCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Build with known segments: DIC + TYPE(3-4) + YEAR(4) + GROUP(4) + GROUP(4)
  // Simpler: insert a dash every 4 chars after the first 3.
  // But our format mixes: DIC-PRO|TEAM|BETA-YYYY-XXXX-XXXX
  // Heuristic: rebuild from cleaned, slicing at 3/{3 or 4}/4/4/4 boundaries.
  if (!cleaned) return "";

  const parts: string[] = [];
  let i = 0;
  // segment 1: "DIC" (3 chars)
  parts.push(cleaned.slice(i, i + 3));
  i += 3;
  if (i >= cleaned.length) return parts.filter(Boolean).join("-");
  // segment 2: type — accept 3 (PRO) or 4 (TEAM, BETA)
  const typeLen = cleaned.startsWith("DICTEAM") || cleaned.startsWith("DICBETA") ? 4 : 3;
  parts.push(cleaned.slice(i, i + typeLen));
  i += typeLen;
  // segment 3: year (4)
  parts.push(cleaned.slice(i, i + 4));
  i += 4;
  // segment 4: group 1 (4)
  parts.push(cleaned.slice(i, i + 4));
  i += 4;
  // segment 5: group 2 (4)
  parts.push(cleaned.slice(i, i + 4));
  i += 4;
  return parts.filter(Boolean).join("-");
}

const LicenseStep: React.FC<LicenseStepProps> = ({ onActivated }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  // Auto-skip if a valid token already lives in the keychain.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const has = await commands.hasLicenseToken();
        if (cancelled) return;
        if (has === true) {
          const info = await commands.getLicenseState();
          if (info?.is_unlocked) {
            onActivated();
          }
        }
      } catch (e) {
        console.warn("license auto-check failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onActivated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await commands.activateLicense(code.trim());
      if (result.status === "ok") {
        if (result.data.is_unlocked) {
          onActivated();
        } else {
          setError(
            t("onboarding.license.notActive", {
              defaultValue:
                "De code is geldig maar de licentie is niet actief. Controleer je facturering.",
            }),
          );
        }
      } else {
        setError(
          result.error ??
            t("onboarding.license.activationFailed", {
              defaultValue: "Activatie mislukt. Controleer de code en probeer opnieuw.",
            }),
        );
      }
    } catch (err) {
      setError(
        (err as { message?: string } | string)?.toString() ??
          t("onboarding.license.activationFailed", {
            defaultValue: "Activatie mislukt. Controleer de code en probeer opnieuw.",
          }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuy = () => {
    void commands.openPricingPage();
  };

  const handleStartTrial = async () => {
    setError(null);
    setIsStartingTrial(true);
    try {
      // Trial loopt via web: account aanmaken → server claimt trial →
      // mail met code → user paste die code hierboven.
      await commands.openTrialStartPage();
    } catch (err) {
      setError(
        (err as { message?: string } | string)?.toString() ??
          t("onboarding.license.trialFailed", {
            defaultValue: "Kon trial-pagina niet openen.",
          }),
      );
    } finally {
      setIsStartingTrial(false);
    }
  };

  const isDisabled =
    code.replace(/-/g, "").length < 15 || isSubmitting || isStartingTrial;
  const isBusy = isSubmitting || isStartingTrial;

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center"
      style={{ background: "var(--bg)", padding: 24 }}
    >
      <div
        className="w-full max-w-md flex flex-col items-center text-center"
        style={{
          background: "white",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border)",
          padding: 40,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <DicterenTextLogo width={180} />

        <h1
          className="text-center"
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--navy)",
            marginTop: 18,
          }}
        >
          {t("onboarding.license.title", {
            defaultValue: "Activeer Dicteren.ai",
          })}
        </h1>
        <p
          className="text-center"
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 6,
            maxWidth: 360,
          }}
        >
          {t("onboarding.license.subtitle", {
            defaultValue:
              "Voer je licentiecode in om Dicteren.ai te ontgrendelen. Geen code? Start hieronder 14 dagen gratis.",
          })}
        </p>

        <form onSubmit={handleSubmit} className="w-full" style={{ marginTop: 28 }}>
          <label
            htmlFor="license-code"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "block",
              textAlign: "left",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              marginBottom: 6,
            }}
          >
            {t("onboarding.license.label", { defaultValue: "Licentiecode" })}
          </label>
          <input
            id="license-code"
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value))}
            placeholder="DIC-PRO-2026-XXXX-XXXX"
            className="dc-input dc-input-code"
            disabled={isSubmitting}
          />

          {error && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--red)",
                textAlign: "left",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 16 }}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isSubmitting && <KeyRound className="w-4 h-4" />}
            {isSubmitting
              ? t("onboarding.license.activating", {
                  defaultValue: "Activeren…",
                })
              : t("onboarding.license.activate", {
                  defaultValue: "Activeer licentie",
                })}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "var(--text-soft)",
              margin: "16px 0",
            }}
          >
            <span
              style={{
                flex: 1,
                height: 1,
                background: "var(--border)",
              }}
            />
            <span>{t("onboarding.license.or", { defaultValue: "Of" })}</span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "var(--border)",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleStartTrial}
            disabled={isBusy}
            className="btn btn-secondary"
            style={{ width: "100%" }}
          >
            {isStartingTrial ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {isStartingTrial
              ? t("onboarding.license.openingTrial", {
                  defaultValue: "Browser openen…",
                })
              : t("onboarding.license.startTrial", {
                  defaultValue: "Probeer 14 dagen gratis",
                })}
          </button>

          <button
            type="button"
            onClick={handleBuy}
            style={{
              width: "100%",
              marginTop: 14,
              fontSize: 12,
              color: "var(--text-muted)",
              padding: 8,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t("onboarding.license.noCode", {
              defaultValue: "Bekijk alle prijzen op dicteren.ai/prijzen",
            })}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LicenseStep;
