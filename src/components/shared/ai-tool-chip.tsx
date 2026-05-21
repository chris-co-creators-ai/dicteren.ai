import { cn } from "@/lib/utils";

export type AiTool =
  | "chatgpt"
  | "claude"
  | "copilot"
  | "gemini"
  | "perplexity"
  | "mistral";

const TOOL_META: Record<AiTool, { label: string; dot: string }> = {
  chatgpt: { label: "ChatGPT", dot: "#10A37F" },
  claude: { label: "Claude", dot: "#D77655" },
  copilot: { label: "Copilot", dot: "#2F2F2F" },
  gemini: { label: "Gemini", dot: "#4285F4" },
  perplexity: { label: "Perplexity", dot: "#20808D" },
  mistral: { label: "Mistral Le Chat", dot: "#FA520E" },
};

type AiToolChipProps = {
  tool: AiTool;
  className?: string;
};

export function AiToolChip({ tool, className }: AiToolChipProps) {
  const meta = TOOL_META[tool];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--navy)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: meta.dot }}
      />
      {meta.label}
    </span>
  );
}

export function AiToolChipList({ tools, className }: { tools: AiTool[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {tools.map((t) => (
        <AiToolChip key={t} tool={t} />
      ))}
    </div>
  );
}
