import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ask } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, Clock, KeyRound, XCircle } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { AppDataDirectory } from "../AppDataDirectory";
import { LogDirectory } from "../debug";
import { commands, type LicenseInfo } from "@/bindings";
import brandIcon from "@/assets/branding/icon-only-master.png";

function formatDateNL(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [license, setLicense] = useState<LicenseInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const appVersion = await getVersion();
        if (!cancelled) setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        if (!cancelled) setVersion("0.0.0");
      }
    })();
    (async () => {
      try {
        const info = await commands.getLicenseState();
        if (!cancelled) setLicense(info);
      } catch (error) {
        console.error("Failed to read license state:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusMeta = (() => {
    const s = license?.status ?? "unknown";
    switch (s) {
      case "active":
        return {
          label: t("settings.about.licenseStatus.active"),
          color: "var(--green)",
          bg: "var(--green-50)",
          icon: CheckCircle2,
        };
      case "trial":
        return {
          label: t("settings.about.licenseStatus.trial"),
          color: "var(--orange-600)",
          bg: "var(--orange-50)",
          icon: Clock,
        };
      case "past_due":
        return {
          label: t("settings.about.licenseStatus.pastDue"),
          color: "var(--orange-600)",
          bg: "var(--orange-50)",
          icon: Clock,
        };
      case "expired":
        return {
          label: t("settings.about.licenseStatus.expired"),
          color: "var(--red)",
          bg: "var(--red-50)",
          icon: XCircle,
        };
      case "canceled":
        return {
          label: t("settings.about.licenseStatus.canceled"),
          color: "var(--text-muted)",
          bg: "var(--bg-deep)",
          icon: XCircle,
        };
      case "refunded":
        return {
          label: t("settings.about.licenseStatus.refunded"),
          color: "var(--red)",
          bg: "var(--red-50)",
          icon: XCircle,
        };
      case "revoked":
        return {
          label: t("settings.about.licenseStatus.revoked"),
          color: "var(--red)",
          bg: "var(--red-50)",
          icon: XCircle,
        };
      default:
        return {
          label: t("settings.about.licenseStatus.unknown"),
          color: "var(--text-muted)",
          bg: "var(--bg-deep)",
          icon: KeyRound,
        };
    }
  })();

  const StatusIcon = statusMeta.icon;
  const isTrial =
    license?.status === "trial" || license?.license_type === "beta";
  const expiryText = license?.expires_at
    ? t("settings.about.licenseStatus.validUntil", {
        date: formatDateNL(license.expires_at),
      })
    : t("settings.about.licenseStatus.noExpiry");
  const hasActiveLicense =
    license?.is_unlocked ||
    license?.status === "trial" ||
    license?.status === "active";

  const open = (url: string) => {
    void openUrl(url).catch((err) => console.warn("openUrl failed", err));
  };

  const handleDeactivate = async () => {
    const ok = await ask(t("settings.about.deactivate.confirmBody"), {
      title: t("settings.about.deactivate.confirmTitle"),
      kind: "warning",
    });
    if (!ok) return;
    try {
      await commands.clearLicenseToken();
      const info = await commands.getLicenseState();
      setLicense(info);
    } catch (error) {
      console.error("Failed to deactivate license:", error);
    }
  };

  return (
    <div
      className="w-full"
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
    >
      {/* Hero card */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <img
          src={brandIcon}
          alt=""
          style={{ width: 56, height: 56, borderRadius: "50%" }}
          draggable={false}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--navy)",
              letterSpacing: "-0.01em",
            }}
          >
            Dicteren.ai
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              marginTop: 2,
            }}
          >
            v{version}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: "var(--r-pill)",
            background: statusMeta.bg,
            color: statusMeta.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <StatusIcon size={14} strokeWidth={2.2} />
          {statusMeta.label}
        </span>
      </div>

      {/* Support and legal */}
      <SettingsGroup title={t("settings.about.supportSection")}>
        <SettingContainer
          title={t("settings.about.support.title")}
          description={t("settings.about.support.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => open("mailto:info@dicteren.ai")}
          >
            {t("settings.about.support.button")}
          </Button>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.privacy.title")}
          description={t("settings.about.privacy.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => open("https://dicteren.ai/privacy")}
          >
            {t("settings.about.privacy.button")}
          </Button>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.terms.title")}
          description={t("settings.about.terms.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => open("https://dicteren.ai/voorwaarden")}
          >
            {t("settings.about.terms.button")}
          </Button>
        </SettingContainer>
      </SettingsGroup>

      {/* App info */}
      <SettingsGroup title={t("settings.about.appInfoSection")}>
        <SettingContainer
          title={t("settings.about.website.title")}
          description={t("settings.about.website.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => open("https://dicteren.ai")}
          >
            {t("settings.about.website.button")}
          </Button>
        </SettingContainer>

        <AppDataDirectory descriptionMode="tooltip" grouped={true} />
        <LogDirectory grouped={true} />
      </SettingsGroup>

      {/* Acknowledgments */}
      <SettingsGroup title={t("settings.about.acknowledgments.title")}>
        <SettingContainer
          title={t("settings.about.acknowledgments.madeWithLove.title")}
          description={t(
            "settings.about.acknowledgments.madeWithLove.description",
          )}
          grouped={true}
          layout="stacked"
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {t("settings.about.acknowledgments.madeWithLove.details")}
          </div>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
