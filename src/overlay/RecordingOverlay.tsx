import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./RecordingOverlay.css";
import brandIcon from "@/assets/branding/icon-only-master.png";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const NUM_BARS = 6;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(NUM_BARS).fill(0));
  const smoothedLevelsRef = useRef<number[]>(Array(NUM_BARS).fill(0));
  const [elapsed, setElapsed] = useState(0);
  const recordingStartRef = useRef<number | null>(null);
  const direction = getLanguageDirection(i18n.language);

  useEffect(() => {
    const setupEventListeners = async () => {
      const unlistenShow = await listen("show-overlay", async (event) => {
        await syncLanguageFromSettings();
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
        if (overlayState === "recording") {
          recordingStartRef.current = Date.now();
          setElapsed(0);
        }
      });

      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
        recordingStartRef.current = null;
        setElapsed(0);
      });

      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];
        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          return prev * 0.7 + target * 0.3;
        });
        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed.slice(0, NUM_BARS));
      });

      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
      };
    };

    setupEventListeners();
  }, []);

  useEffect(() => {
    if (state !== "recording" || !isVisible) return;
    const id = window.setInterval(() => {
      if (recordingStartRef.current) {
        setElapsed(
          Math.floor((Date.now() - recordingStartRef.current) / 1000),
        );
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [state, isVisible]);

  const label =
    state === "recording" ? "Aan het luisteren…" : "Dicteren..";
  const showLive = state === "recording";

  return (
    <div
      dir={direction}
      className={`mini-bar ${isVisible ? "fade-in" : ""}`}
    >
      <span className="mini-bar-icon" aria-hidden>
        <img src={brandIcon} alt="" draggable={false} />
      </span>

      <span className="mini-bar-label">{label}</span>

      <span
        className="wave"
        aria-hidden
        style={{ opacity: showLive ? 1 : 0 }}
      >
        {levels.map((v, i) => (
          <i
            key={i}
            style={{
              height: `${Math.min(22, 6 + Math.pow(v, 0.7) * 16)}px`,
              opacity: Math.max(0.45, v * 1.6),
            }}
          />
        ))}
      </span>

      <span
        className="mini-bar-timer"
        style={{ opacity: showLive ? 1 : 0 }}
      >
        {formatTimer(elapsed)}
      </span>
    </div>
  );
};

export default RecordingOverlay;
