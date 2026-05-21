import { AiToolChipList } from "@/components/shared/ai-tool-chip";

export function ProofStripSection() {
  return (
    <section
      className="border-y border-[color:var(--border-soft)] bg-white px-6 py-6 lg:px-14"
      aria-label="Compatibele AI-tools"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-soft)]">
          Werkt fantastisch met
        </span>
        <AiToolChipList tools={["chatgpt", "claude", "copilot", "gemini"]} />
        <span className="text-xs text-[color:var(--text-soft)]">
          (compatibiliteit · geen officieel partnerschap)
        </span>
      </div>
    </section>
  );
}
