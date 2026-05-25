import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { commands } from "@/bindings";
import DicterenTextLogo from "../icons/DicterenTextLogo";

interface LicenseStepProps {
  onActivated: () => void;
}

function formatCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  const parts: string[] = [];
  let i = 0;
  parts.push(cleaned.slice(i, i + 3));
  i += 3;
  if (i >= cleaned.length) return parts.filter(Boolean).join("-");
  // Type-segment length per prefix: TRIAL=5, TEAM/BETA=4, PRO (default)=3
  let typeLen = 3;
  if (cleaned.startsWith("DICTRIAL")) typeLen = 5;
  else if (cleaned.startsWith("DICTEAM") || cleaned.startsWith("DICBETA"))
    typeLen = 4;
  parts.push(cleaned.slice(i, i + typeLen));
  i += typeLen;
  parts.push(cleaned.slice(i, i + 4));
  i += 4;
  parts.push(cleaned.slice(i, i + 4));
  i += 4;
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
                "Code geldig maar licentie is niet actief. Controleer je facturering.",
            }),
          );
        }
      } else {
        setError(
          result.error ??
            t("onboarding.license.activationFailed", {
              defaultValue:
                "Activatie mislukt. Controleer de code en probeer opnieuw.",
            }),
        );
      }
    } catch (err) {
      setError(
        (err as { message?: string } | string)?.toString() ??
          t("onboarding.license.activationFailed", {
            defaultValue:
              "Activatie mislukt. Controleer de code en probeer opnieuw.",
          }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTrial = async () => {
    setError(null);
    setIsStartingTrial(true);
    try {
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

  const handleBuy = () => {
    void commands.openPricingPage();
  };

  const isDisabled =
    code.replace(/-/g, "").length < 15 || isSubmitting || isStartingTrial;

  return (
    <div className="h-screen w-screen flex flex-col p-6 gap-6 items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-2">
        <DicterenTextLogo width={200} />
      </div>

      <div className="max-w-md w-full flex flex-col items-center gap-4">
        <div className="text-center mb-2">
          <h2 className="text-xl font-semibold text-[#0A2A73] mb-2">
            {t("onboarding.license.title", {
              defaultValue: "Activeer Dicteren.ai",
            })}
          </h2>
          <p className="text-[#0A2A73]/70">
            {t("onboarding.license.subtitle", {
              defaultValue:
                "Plak je licentiecode uit je mail. Geen code? Start onderaan 14 dagen gratis.",
            })}
          </p>
        </div>

        {/* License code form */}
        <div className="w-full p-4 rounded-xl bg-[#f7fbff] border border-[#d6e5fa] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-logo-primary/20 shrink-0">
              <KeyRound className="w-6 h-6 text-logo-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[#0A2A73]">
                {t("onboarding.license.cardTitle", {
                  defaultValue: "Heb je een code?",
                })}
              </h3>
              <p className="text-sm text-[#0A2A73]/70 mb-3">
                {t("onboarding.license.cardDescription", {
                  defaultValue: "Voer de code uit je e-mail in om te ontgrendelen.",
                })}
              </p>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2 w-full"
              >
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
                  style={{ width: "100%" }}
                />
                {error && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--red)",
                      marginTop: 2,
                    }}
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isDisabled}
                  className="px-4 py-2 rounded-lg bg-logo-primary hover:bg-logo-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  {isSubmitting
                    ? t("onboarding.license.activating", {
                        defaultValue: "Activeren…",
                      })
                    : t("onboarding.license.activate", {
                        defaultValue: "Activeer licentie",
                      })}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Trial card */}
        <div className="w-full p-4 rounded-xl bg-[#f7fbff] border border-[#d6e5fa] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-logo-primary/20 shrink-0">
              <Clock className="w-6 h-6 text-logo-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[#0A2A73]">
                {t("onboarding.license.trialTitle", {
                  defaultValue: "Eerst proberen?",
                })}
              </h3>
              <p className="text-sm text-[#0A2A73]/70 mb-3">
                {t("onboarding.license.trialDescription", {
                  defaultValue:
                    "Start 14 dagen gratis op dicteren.ai. Je krijgt direct een code per mail.",
                })}
              </p>
              <button
                type="button"
                onClick={handleStartTrial}
                disabled={isSubmitting || isStartingTrial}
                className="px-4 py-2 rounded-lg bg-white border border-[#d6e5fa] text-[#0A2A73] hover:bg-[#f3f8ff] text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isStartingTrial ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {isStartingTrial
                  ? t("onboarding.license.openingTrial", {
                      defaultValue: "Browser openen…",
                    })
                  : t("onboarding.license.startTrial", {
                      defaultValue: "Start 14 dagen gratis",
                    })}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBuy}
          className="text-sm text-[#0A2A73]/60 hover:text-[#0A2A73] underline transition-colors"
        >
          {t("onboarding.license.noCode", {
            defaultValue: "Bekijk alle prijzen",
          })}
        </button>
      </div>
    </div>
  );
};

export default LicenseStep;
