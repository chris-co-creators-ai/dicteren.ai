import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ModelInfo } from "@/bindings";
import DicterenTextLogo from "../icons/DicterenTextLogo";
import { useModelStore } from "../../stores/modelStore";
import { Loader2, CheckCircle2 } from "lucide-react";
import installVisual1 from "@/assets/onboarding/install-visual-1.png";
import installVisual2 from "@/assets/onboarding/install-visual-2.png";
import installVisual3 from "@/assets/onboarding/install-visual-3.png";

interface OnboardingProps {
  onModelSelected: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onModelSelected }) => {
  const { t } = useTranslation();
  const {
    models,
    downloadModel,
    selectModel,
    downloadingModels,
    verifyingModels,
    extractingModels,
    downloadProgress,
  } = useModelStore();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const [autoInstallError, setAutoInstallError] = useState<string | null>(null);
  const autoInstallStartedRef = useRef(false);

  const progress = selectedModelId
    ? Math.max(0, Math.min(100, downloadProgress[selectedModelId]?.percentage ?? 0))
    : 0;
  const isDownloading = selectedModelId ? selectedModelId in downloadingModels : false;
  const isVerifying = selectedModelId ? selectedModelId in verifyingModels : false;
  const isExtracting = selectedModelId ? selectedModelId in extractingModels : false;
  const isBusy = isAutoStarting || isDownloading || isVerifying || isExtracting;
  const statusText = autoInstallError
    ? autoInstallError
    : isExtracting
      ? t("onboarding.autoInstall.extracting", {
          defaultValue: "Model uitpakken...",
        })
      : isVerifying
        ? t("onboarding.autoInstall.verifying", {
            defaultValue: "Download controleren...",
          })
        : isBusy
          ? t("onboarding.autoInstall.downloading", {
              defaultValue: "Model downloaden...",
            })
          : t("onboarding.autoInstall.done", {
              defaultValue: "Model klaar. We gaan verder...",
            });
  const installVisual =
    progress < 34 ? installVisual1 : progress < 67 ? installVisual2 : installVisual3;

  const recommendedModel =
    models.find((m: ModelInfo) => m.is_recommended) ?? models[0] ?? null;

  // Watch for the selected model to finish downloading + verifying + extracting,
  // then select it and continue automatically.
  useEffect(() => {
    if (!selectedModelId) return;

    const model = models.find((m) => m.id === selectedModelId);

    if (model?.is_downloaded && !isDownloading && !isVerifying && !isExtracting) {
      // Model is ready — select it and transition
      selectModel(selectedModelId).then((success) => {
        if (success) {
          onModelSelected();
        } else {
          toast.error(t("onboarding.errors.selectModel"));
          setSelectedModelId(null);
        }
      });
    }
  }, [
    selectedModelId,
    models,
    isDownloading,
    isVerifying,
    isExtracting,
    selectModel,
    onModelSelected,
    t,
  ]);

  const startAutoInstall = async (modelId: string) => {
    if (autoInstallStartedRef.current) return;

    autoInstallStartedRef.current = true;
    setAutoInstallError(null);
    setSelectedModelId(modelId);
    setIsAutoStarting(true);

    const success = await downloadModel(modelId);
    if (!success) {
      setAutoInstallError(t("onboarding.downloadFailed"));
      setSelectedModelId(null);
      autoInstallStartedRef.current = false;
    }
    setIsAutoStarting(false);
  };

  // Start automatic install flow once models are loaded.
  useEffect(() => {
    if (models.length === 0 || selectedModelId || autoInstallStartedRef.current) return;
    if (!recommendedModel) return;

    // If already downloaded, immediately select and continue.
    if (recommendedModel.is_downloaded) {
      selectModel(recommendedModel.id).then((success) => {
        if (success) {
          onModelSelected();
        } else {
          setAutoInstallError(t("onboarding.errors.selectModel"));
        }
      });
      return;
    }

    void startAutoInstall(recommendedModel.id);
  }, [models, recommendedModel, selectedModelId, selectModel, onModelSelected, t]);

  useEffect(() => {
    if (!selectedModelId || !isDownloading || progress > 0) return;

    const timeout = window.setTimeout(() => {
      setAutoInstallError(
        t("onboarding.autoInstall.noProgress", {
          defaultValue:
            "De modeldownload start niet. Controleer of models.dicteren.ai bereikbaar is.",
        }),
      );
    }, 15000);

    return () => window.clearTimeout(timeout);
  }, [selectedModelId, isDownloading, progress, t]);

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(180deg, white 0%, var(--aqua-50) 100%)",
        padding: 24,
      }}
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
        <div
          className="flex items-center justify-center"
          style={{ width: 120, height: 120, marginTop: 14 }}
        >
          <img
            src={installVisual}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--navy)",
            marginTop: 14,
          }}
        >
          {t("onboarding.autoInstall.title", {
            defaultValue: "Dicteren.ai V3 wordt geïnstalleerd",
          })}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 6,
            maxWidth: 360,
          }}
        >
          {t("onboarding.autoInstall.subtitle", {
            defaultValue:
              "We installeren automatisch het model. Daarna ga je direct verder.",
          })}
        </p>

        <div className="w-full" style={{ marginTop: 26 }}>
          <div
            className="flex items-center justify-between"
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              marginBottom: 8,
            }}
          >
            <span
              style={{ color: "var(--orange-600)", fontWeight: 600 }}
            >
              {statusText}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="dc-progress">
            <div
              className="dc-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="flex items-center gap-2"
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <CheckCircle2
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--green)" }}
              />
            )}
          </div>

          {autoInstallError && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--red)",
                  marginBottom: 8,
                  textAlign: "left",
                }}
              >
                {autoInstallError}
              </p>
              {recommendedModel && !isBusy && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => startAutoInstall(recommendedModel.id)}
                >
                  {t("common.retry")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
