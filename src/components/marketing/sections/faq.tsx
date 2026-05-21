import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Wordt mijn stem naar een server gestuurd?",
    a: "Nee. Het taalmodel draait op je eigen computer. Je audio blijft op je apparaat.",
    defaultOpen: true,
  },
  {
    q: "Werkt het ook in andere talen?",
    a: "Het model is gemaakt voor Nederlands. Engels werkt ook. Andere talen volgen later.",
  },
  {
    q: "In welke apps kan ik dicteren?",
    a: "Overal waar je tekst kunt typen. Mail, browser, Word, je AI-tool, je editor.",
  },
  {
    q: "Kan ik mijn licentie op meer dan één apparaat gebruiken?",
    a: "Ja. Een persoonlijke licentie werkt op twee apparaten. Een zakelijke licentie is per gebruiker.",
  },
];

export function FaqSection() {
  return (
    <section className="border-t border-[color:var(--border-soft)] bg-white px-6 py-20 lg:px-14 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-7 text-3xl font-bold tracking-tight lg:text-4xl">
          Veelgestelde vragen
        </h2>
        <div>
          {FAQS.map((f, i) => (
            <details
              key={i}
              open={f.defaultOpen}
              className="border-t border-[color:var(--border-soft)] py-4 [&_summary::-webkit-details-marker]:hidden [&[open]_summary_svg]:rotate-45"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 text-base font-semibold lg:text-[17px]">
                <Plus
                  className="size-4 shrink-0 transition-transform"
                  strokeWidth={2.4}
                  style={{ color: "var(--orange)" }}
                />
                {f.q}
              </summary>
              <p className="mt-2.5 pl-7 text-[15px] leading-relaxed text-[color:var(--text-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
