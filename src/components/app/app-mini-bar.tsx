"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useFakeAudioLevel } from "@/hooks/use-fake-audio-level";
import styles from "./app-mini-bar.module.css";

export type AppMiniBarState = "recording" | "transcribing" | "idle";

interface AppMiniBarProps {
  /** Toon de pill of niet. Bij true: fade-in animatie. */
  visible?: boolean;
  /** Welk label en welke amplitude-loop tonen. */
  state?: AppMiniBarState;
  /** Reset de timer naar 0 wanneer deze key wijzigt. */
  timerKey?: string | number;
  className?: string;
}

const NUM_BARS = 6;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AppMiniBar({
  visible = true,
  state = "recording",
  timerKey,
  className,
}: AppMiniBarProps) {
  const active = visible && state === "recording";
  const levels = useFakeAudioLevel(active, NUM_BARS);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      // Reset elapsed display when toggling inactive. Deriving this outside
      // the effect would mean the previous count briefly shows on next render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [active, timerKey]);

  const label = state === "recording" ? "Aan het luisteren…" : "Dicteren..";
  const showLive = state === "recording";

  return (
    <div
      className={`${styles.miniBar} ${visible ? styles.fadeIn : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden>
        <Image
          src="/branding/app-icon-512.png"
          alt=""
          width={36}
          height={36}
          priority
        />
      </span>

      <span className={styles.label}>{label}</span>

      <span
        className={styles.wave}
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

      <span className={styles.timer} style={{ opacity: showLive ? 1 : 0 }}>
        {formatTimer(elapsed)}
      </span>
    </div>
  );
}
