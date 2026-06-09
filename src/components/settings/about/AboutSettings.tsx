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
import christianPhoto from "@/assets/branding/christian-bleeker.jpg";

const LinkedInIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

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

      {/* Founder card */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: 20,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <img
          src={christianPhoto}
          alt={t("settings.about.founder.name")}
          style={{
            width: 64,
            height: 80,
            borderRadius: 12,
            objectFit: "cover",
            flexShrink: 0,
          }}
          draggable={false}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-muted)",
            }}
          >
            {t("settings.about.founder.section")}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--navy)",
              marginTop: 2,
            }}
          >
            {t("settings.about.founder.name")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
            {t("settings.about.founder.role")}
          </div>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--text-muted)",
              marginTop: 10,
            }}
          >
            {t("settings.about.founder.bio")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 11px",
                borderRadius: "var(--r-pill)",
                background: "var(--orange-50)",
                color: "var(--orange-600)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t("settings.about.founder.tedx")}
            </span>
            <button
              onClick={() => open("https://www.linkedin.com/in/christianbleeker/")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                borderRadius: "var(--r-pill)",
                background: "var(--bg-deep)",
                color: "var(--navy)",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <LinkedInIcon size={14} />
              {t("settings.about.founder.linkedin")}
            </button>
          </div>
        </div>
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
