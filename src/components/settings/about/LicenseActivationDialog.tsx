import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2, X } from "lucide-react";
import { commands } from "@/bindings";

function formatCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  const parts: string[] = [];
  let i = 0;
  parts.push(cleaned.slice(i, i + 3));
  i += 3;
  if (i >= cleaned.length) return parts.filter(Boolean).join("-");
  const typeLen =
    cleaned.startsWith("DICTEAM") || cleaned.startsWith("DICBETA") ? 4 : 3;
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

interface LicenseActivationDialogProps {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}

export const LicenseActivationDialog: React.FC<
  LicenseActivationDialogProps
> = ({ open, onClose, onActivated }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await commands.activateLicense(code.trim());
      if (result.status === "ok") {
        if (result.data.is_unlocked) {
          onActivated();
          setCode("");
          onClose();
        } else {
          setError(t("settings.about.activateLicense.notActive"));
        }
      } else {
        setError(
          result.error ?? t("settings.about.activateLicense.failed"),
        );
      }
    } catch (err) {
      const message =
        (err as { message?: string } | string | undefined)?.toString?.() ?? "";
      setError(message || t("settings.about.activateLicense.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = code.replace(/-/g, "").length < 15 || isSubmitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border)",
          padding: 32,
          maxWidth: 460,
          width: "100%",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("settings.about.activateLicense.cancel")}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
            borderRadius: "var(--r-sm)",
          }}
        >
          <X size={18} />
        </button>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--navy)",
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}
        >
          {t("settings.about.activateLicense.dialogTitle")}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {t("settings.about.activateLicense.dialogSubtitle")}
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="activate-license-code"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "block",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              marginBottom: 6,
            }}
          >
            {t("settings.about.activateLicense.label")}
          </label>
          <input
            id="activate-license-code"
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value))}
            placeholder={t("settings.about.activateLicense.placeholder")}
            className="dc-input dc-input-code"
            disabled={isSubmitting}
          />

          {error && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--red)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            {isSubmitting
              ? t("settings.about.activateLicense.submitting")
              : t("settings.about.activateLicense.submit")}
          </button>
        </form>
      </div>
    </div>
  );
};
