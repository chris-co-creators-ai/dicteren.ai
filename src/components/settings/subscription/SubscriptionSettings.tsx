import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ask } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, Clock, KeyRound, XCircle } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { LicenseActivationDialog } from "./LicenseActivationDialog";
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

export const SubscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);

  const refreshLicense = async () => {
    try {
      const info = await commands.getLicenseState();
      setLicense(info);
    } catch (error) {
      console.error("Failed to read license state:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;
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
          label: t("settings.subscription.status.active"),
          color: "var(--green)",
          bg: "var(--green-50)",
          icon: CheckCircle2,
        };
      case "trial":
        return {
          label: t("settings.subscription.status.trial"),
          color: "var(--orange-600)",
          bg: "var(--orange-50)",
          icon: Clock,
        };
      case "past_due":
        return {
          label: t("settings.subscription.status.pastDue"),
          color: "var(--orange-600)",
          bg: "var(--orange-50)",
          icon: Clock,
        };
      case "expired":
        return {
          label: t("settings.subscription.status.expired"),
          color: "var(--red)",
          bg: "var(--red-50)",
          icon: XCircle,
        };
      case "canceled":
        return {
          label: t("settings.subscription.status.canceled"),
          color: "var(--text-muted)",
          bg: "var(--bg-deep)",
          icon: XCircle,
        };
      case "refunded":
        return {
          label: t("settings.subscription.status.refunded"),
          color: "var(--red)",
          bg: "var(--red-50)",
          icon: XCircle,
        };
      case "revoked":
        return {
          label: t("settings.subscription.status.revoked"),
          color: "var(--red)",
          bg: "var(--red-50)",
          icon: XCircle,
        };
      default:
        return {
          label: t("settings.subscription.status.unknown"),
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
    ? t("settings.subscription.validUntil", {
        date: formatDateNL(license.expires_at),
      })
    : t("settings.subscription.noExpiry");
  const hasActiveLicense =
    license?.is_unlocked ||
    license?.status === "trial" ||
    license?.status === "active";

  // Discount-label voor "3 maanden gratis" / "Lifetime gratis" badge.
  const discountLabel = (() => {
    const type = license?.discount_type;
    const value = license?.discount_value;
    if (!type || value === null || value === undefined) return null;
    if (type === "free_months") return `${value} maanden gratis`;
    if (type === "lifetime") return "Lifetime gratis";
    if (type === "percentage") return `-${value}%`;
    if (type === "fixed") return `-€${(Number(value) / 100).toFixed(2)}`;
    return null;
  })();

  const nextBilling = license?.next_billing_at
    ? formatDateNL(license.next_billing_at)
    : null;

  const open = (url: string) => {
    void openUrl(url).catch((err) => console.warn("openUrl failed", err));
  };

  const handleDeactivate = async () => {
    const ok = await ask(t("settings.subscription.deactivate.confirmBody"), {
      title: t("settings.subscription.deactivate.confirmTitle"),
      kind: "warning",
    });
    if (!ok) return;
    try {
      await commands.clearLicenseToken();
      await refreshLicense();
    } catch (error) {
      console.error("Failed to deactivate license:", error);
    }
  };

  return (
    <div
      className="w-full"
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
    >
      {/* Status hero */}
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
              fontSize: 14,
              fontWeight: 700,
              color: "var(--navy)",
              letterSpacing: "-0.01em",
            }}
          >
            {hasActiveLicense
              ? license?.plan_label ??
                t("settings.subscription.heroActive")
              : t("settings.subscription.heroInactive")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {hasActiveLicense
              ? expiryText
              : t("settings.subscription.heroInactiveHint")}
          </div>
          {hasActiveLicense && (discountLabel || nextBilling) && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-soft)",
                marginTop: 4,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {discountLabel && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: "var(--r-pill)",
                    background: "var(--orange-50)",
                    color: "var(--orange-600)",
                    fontWeight: 600,
                  }}
                >
                  {discountLabel}
                </span>
              )}
              {nextBilling && !isTrial && (
                <span>Volgende incasso {nextBilling}</span>
              )}
            </div>
          )}
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

      {/* Activate + buy — conditional based on license state */}
      {(() => {
        const showActivate = !hasActiveLicense;
        const showBuy = !hasActiveLicense || isTrial;
        if (!showActivate && !showBuy) return null;
        return (
          <SettingsGroup title={t("settings.subscription.activateSection")}>
            {showActivate && (
              <SettingContainer
                title={t("settings.subscription.activate.title")}
                description={t("settings.subscription.activate.description")}
                grouped={true}
              >
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setActivateOpen(true)}
                >
                  {t("settings.subscription.activate.button")}
                </Button>
              </SettingContainer>
            )}

            {showBuy && (
              <SettingContainer
                title={
                  isTrial
                    ? t("settings.subscription.upgrade.title")
                    : t("settings.subscription.buy.title")
                }
                description={
                  isTrial
                    ? t("settings.subscription.upgrade.description")
                    : t("settings.subscription.buy.description")
                }
                grouped={true}
              >
                <Button
                  variant={isTrial ? "primary" : "secondary"}
                  size="md"
                  onClick={() => open("https://dicteren.ai/prijzen")}
                >
                  {isTrial
                    ? t("settings.subscription.upgrade.button")
                    : t("settings.subscription.buy.button")}
                </Button>
              </SettingContainer>
            )}
          </SettingsGroup>
        );
      })()}

      {/* Account links */}
      <SettingsGroup title={t("settings.subscription.accountSection")}>
        <SettingContainer
          title={t("settings.subscription.account.title")}
          description={t("settings.subscription.account.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => open("https://dicteren.ai/account")}
          >
            {t("settings.subscription.account.button")}
          </Button>
        </SettingContainer>

        {hasActiveLicense && !isTrial && (
          <SettingContainer
            title={t("settings.subscription.billing.title")}
            description={t("settings.subscription.billing.description")}
            grouped={true}
          >
            <Button
              variant="secondary"
              size="md"
              onClick={() => open("https://dicteren.ai/account/billing")}
            >
              {t("settings.subscription.billing.button")}
            </Button>
          </SettingContainer>
        )}

        {hasActiveLicense && (
          <SettingContainer
            title={t("settings.subscription.deactivate.title")}
            description={t("settings.subscription.deactivate.description")}
            grouped={true}
          >
            <Button variant="secondary" size="md" onClick={handleDeactivate}>
              {t("settings.subscription.deactivate.button")}
            </Button>
          </SettingContainer>
        )}
      </SettingsGroup>

      <LicenseActivationDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onActivated={() => {
          void refreshLicense();
        }}
      />
    </div>
  );
};
