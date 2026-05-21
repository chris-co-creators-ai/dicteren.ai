import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "Veelgestelde vragen" };

const FAQS = [
  {
    q: "Wordt mijn stem naar een server gestuurd?",
    a: "Nee. Het taalmodel draait op je eigen computer. Audio blijft op je apparaat.",
  },
  {
    q: "Werkt het ook in andere talen?",
    a: "Het model is gemaakt voor Nederlands. Engels werkt ook. Andere talen volgen later.",
  },
  {
    q: "In welke apps kan ik dicteren?",
    a: "Overal waar je tekst kunt typen. Mail, browser, Word, je AI-tool, je editor, je EPD of je boekhoudpakket.",
  },
  {
    q: "Kan ik mijn licentie op meer dan één computer gebruiken?",
    a: "Een persoonlijke licentie werkt op twee apparaten, bijvoorbeeld je laptop en je werk-pc. Zakelijke licenties zijn per gebruiker.",
  },
  {
    q: "Heb ik internet nodig?",
    a: "Alleen voor de eerste download van de app en het model. Daarna werk je gewoon offline.",
  },
  {
    q: "Welke modelversie wordt er gebruikt?",
    a: "Dicteren.ai V3. Dat is een taalmodel dat is gemaakt voor Nederlands. Updates krijg je automatisch als je een betaalde licentie hebt.",
  },
  {
    q: "Wat als mijn licentie verloopt?",
    a: "De app blijft werken. Wel stoppen nieuwe modelversies en de snelle support. Je kunt verlengen vanuit je account.",
  },
  {
    q: "Kunnen organisaties een DPA krijgen?",
    a: "Ja. Vraag een DPA aan via info@dicteren.ai bij je zakelijke aanvraag.",
  },
  {
    q: "Hoe annuleer ik?",
    a: "Per maand, kwartaal of jaar. Op elk moment. Bij opzegging loopt je licentie door tot het einde van de betaalperiode.",
  },
];

export default function FaqPage() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <span className="chip">FAQ</span>
        <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl">
          Veelgestelde vragen
        </h1>
        <p className="mt-4 text-base text-[color:var(--text-muted)] sm:text-lg">
          Antwoorden op de vragen die we vaak horen. Mis je iets?{" "}
          <Link
            href="/contact"
            className="font-semibold text-[color:var(--navy-500)] underline-offset-4 hover:underline"
          >
            Stel hem ons direct.
          </Link>
        </p>

        <div className="mt-9">
          {FAQS.map((f, i) => (
            <details
              key={i}
              open={i === 0}
              className="border-t border-[color:var(--border-soft)] py-4 [&_summary::-webkit-details-marker]:hidden [&[open]_summary_svg]:rotate-45"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 text-[15px] font-semibold sm:text-base">
                <Plus
                  className="size-4 shrink-0 translate-y-0.5 transition-transform"
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
