import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CreditCard, KeyRound, Lock, RefreshCw } from "lucide-react";
import { commands, type LicenseInfo } from "@/bindings";
import DicterenTextLogo from "./icons/DicterenTextLogo";

interface LicenseLockScreenProps {
  info: LicenseInfo;
  onReactivate: () => void;
}

interface CopyVariant {
  title: string;
  body: string;
  primaryLabel: string;
  primaryAction: "billing" | "pricing" | "reactivate";
  showReactivateLink: boolean;
}

function copyFor(info: LicenseInfo, t: TFunction): CopyVariant {
  // Trials are consumer licenses with a DIC-TRIAL- code; the backend reads the
  // prefix off the signed token. The old check on license_type === "beta" never
  // matched, so trial users got renewal copy instead of the pricing nudge.
  const isTrial = info.is_trial;

  switch (info.status) {
    case "past_due":
      return {
        title: t("lock.pastDue.title", {
          defaultValue: "Je laatste betaling is mislukt",
        }),
        body: t("lock.pastDue.body", {
          defaultValue:
            "Mollie probeert je betaling automatisch opnieuw. Werk je betaalgegevens bij in je account om door te gaan.",
        }),
        primaryLabel: t("lock.pastDue.primary", {
          defaultValue: "Open facturering",
        }),
        primaryAction: "billing",
        showReactivateLink: false,
      };
    case "expired":
    case "canceled":
      if (isTrial) {
        return {
          title: t("lock.trialExpired.title", {
            defaultValue: "Je gratis proefperiode is voorbij",
          }),
          body: t("lock.trialExpired.body", {
            defaultValue:
              "We hopen dat Dicteren.ai je bevallen is. Kies een abonnement om verder te praten. Je instellingen en geschiedenis blijven bewaard.",
          }),
          primaryLabel: t("lock.trialExpired.primary", {
            defaultValue: "Bekijk de prijzen",
          }),
          primaryAction: "pricing",
          showReactivateLink: true,
        };
      }
      return {
        title: t("lock.expired.title", {
          defaultValue: "Je licentie is verlopen",
        }),
        body: t("lock.expired.body", {
          defaultValue:
            "Verleng om Dicteren.ai te blijven gebruiken. Je instellingen en geschiedenis blijven bewaard.",
        }),
        primaryLabel: t("lock.expired.primary", {
          defaultValue: "Verleng abonnement",
        }),
        primaryAction: "pricing",
        showReactivateLink: true,
      };
    case "refunded":
    case "revoked":
      return {
        title: t("lock.invalid.title", {
          defaultValue: "Deze licentie is niet meer geldig",
        }),
        body: t("lock.invalid.body", {
          defaultValue:
            "Neem contact op met support of activeer een andere licentie.",
        }),
        primaryLabel: t("lock.invalid.primary", {
          defaultValue: "Activeer andere licentie",
        }),
        primaryAction: "reactivate",
        showReactivateLink: false,
      };
    case "unknown":
    default:
      return {
        title: t("lock.unknown.title", {
          defaultValue: "Activeer je licentie",
        }),
        body: t("lock.unknown.body", {
          defaultValue:
            "We konden je licentie niet verifiëren. Activeer opnieuw om door te gaan.",
        }),
        primaryLabel: t("lock.unknown.primary", {
          defaultValue: "Activeer licentie",
        }),
        primaryAction: "reactivate",
        showReactivateLink: false,
      };
  }
}

const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({ info, onReactivate }) => {
  const { t } = useTranslation();
  const variant = copyFor(info, t);

  const handlePrimary = async () => {
    switch (variant.primaryAction) {
      case "billing":
        await commands.openBillingPage();
        break;
      case "pricing":
        await commands.openPricingPage();
        break;
      case "reactivate":
        await commands.clearLicenseToken();
        onReactivate();
        break;
    }
  };

  const handleRecheck = async () => {
    try {
      const r = await commands.refreshLicenseState();
      if (r.status === "ok" && r.data.is_unlocked) {
        // Reload so the App.tsx state picks up the new status cleanly.
        window.location.reload();
      }
    } catch (e) {
      console.warn("recheck failed", e);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 bg-white p-6">
      <div className="flex flex-col items-center gap-3">
        <DicterenTextLogo width={200} />
        <div className="w-14 h-14 rounded-2xl bg-[#fff5ec] border border-[#f7bc8a] flex items-center justify-center">
          <Lock className="w-7 h-7 text-[#FF8F43]" strokeWidth={2} />
        </div>
        <h1 className="text-[#0A2A73] text-xl font-semibold text-center">
          {variant.title}
        </h1>
        <p className="text-[#0A2A73]/70 max-w-md text-center font-medium">
          {variant.body}
        </p>
      </div>

      <div className="max-w-md w-full flex flex-col gap-3">
        <button
          type="button"
          onClick={handlePrimary}
          className="w-full px-4 py-2.5 rounded-lg bg-logo-primary hover:bg-logo-primary/90 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {variant.primaryAction === "reactivate" ? (
            <KeyRound className="w-4 h-4" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {variant.primaryLabel}
        </button>

        <button
          type="button"
          onClick={handleRecheck}
          className="w-full px-4 py-2.5 rounded-lg border border-[#d6e5fa] bg-white hover:bg-[#f7fbff] text-[#0A2A73] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t("lock.recheck", { defaultValue: "Status opnieuw controleren" })}
        </button>

        {variant.showReactivateLink && (
          <button
            type="button"
            onClick={async () => {
              await commands.clearLicenseToken();
              onReactivate();
            }}
            className="w-full text-xs font-semibold text-[#0A2A73]/70 hover:text-[#0A2A73] underline"
          >
            {t("lock.useOtherCode", {
              defaultValue: "Een andere licentiecode gebruiken",
            })}
          </button>
        )}
      </div>
    </div>
  );
};

export default LicenseLockScreen;
