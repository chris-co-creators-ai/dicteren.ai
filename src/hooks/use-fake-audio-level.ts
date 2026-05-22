"use client";

import { useEffect, useRef, useState } from "react";

const NUM_BARS = 6;

export function useFakeAudioLevel(active: boolean, numBars: number = NUM_BARS): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(numBars).fill(0));
  const smoothedRef = useRef<number[]>(Array(numBars).fill(0));
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) {
      smoothedRef.current = Array(numBars).fill(0);
      // Intentional reset to zeros when toggling inactive; the alternative
      // (deriving zeros outside the effect) flickers on rapid toggles.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevels(Array(numBars).fill(0));
      return;
    }

    const id = window.setInterval(() => {
      frameRef.current += 1;
      const t = frameRef.current * 0.08;

      const targets = Array.from({ length: numBars }, (_, i) => {
        const phase = i * 1.7;
        const freq = 1 + i * 0.35;
        const base = Math.sin(t * freq + phase) * 0.5 + 0.5;
        const slow = Math.sin(t * 0.4 + i) * 0.25 + 0.6;
        const jitter = Math.random() * 0.18 - 0.09;
        return Math.max(0, Math.min(1, base * slow * 0.85 + jitter + 0.1));
      });

      const smoothed = smoothedRef.current.map((prev, i) => prev * 0.7 + targets[i] * 0.3);
      smoothedRef.current = smoothed;
      setLevels([...smoothed]);
    }, 80);

    return () => window.clearInterval(id);
  }, [active, numBars]);

  return levels;
}
