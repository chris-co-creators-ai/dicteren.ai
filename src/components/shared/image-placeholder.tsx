import { cn } from "@/lib/utils";

type ImagePlaceholderProps = {
  label?: string;
  className?: string;
  aspectRatio?: string;
};

export function ImagePlaceholder({
  label = "image",
  className,
  aspectRatio,
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn("img-ph", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
      aria-label={`Placeholder: ${label}`}
    >
      {label}
    </div>
  );
}
