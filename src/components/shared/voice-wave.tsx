import { cn } from "@/lib/utils";

type VoiceWaveProps = {
  className?: string;
  bars?: number;
};

export function VoiceWave({ className, bars = 7 }: VoiceWaveProps) {
  return (
    <span
      className={cn("wave", className)}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
