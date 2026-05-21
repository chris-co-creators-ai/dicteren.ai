import { Check, Mic, X } from "lucide-react";

export function ProblemContextSection() {
  const typedBad = [
    "Geen toon meegegeven",
    "Geen achtergrond",
    "Geen voorbeelden of context",
  ];
  const spokenGood = [
    "Toon, datum en tijd helder",
    "Achtergrond meegegeven",
    "AI snapt direct wat je bedoelt",
  ];

  return (
    <section className="px-6 py-20 lg:px-14 lg:py-24">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <span className="chip chip-orange">Het probleem</span>
        <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
          Je typt vaak korter dan je bedoelt. AI raadt de rest.
        </h2>
      </div>

      <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-2">
        {/* Typed */}
        <div className="brand-card p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <span
              className="grid size-9 place-items-center rounded-xl"
              style={{ background: "var(--red-50)" }}
            >
              <X className="size-4.5" strokeWidth={2.2} style={{ color: "var(--red)" }} />
            </span>
            <h3 className="text-lg font-bold">Getypt</h3>
            <span className="chip chip-red ml-auto">14 woorden</span>
          </div>
          <p
            className="rounded-xl p-4 text-base leading-relaxed"
            style={{ background: "#fdf3f4" }}
          >
            “schrijf mail naar huurder over inspectie verzetten naar
            dinsdag”
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {typedBad.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-[color:var(--text-muted)]"
              >
                <X className="size-4" strokeWidth={2.4} style={{ color: "var(--red)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Spoken */}
        <div
          className="brand-card p-7"
          style={{
            borderColor: "var(--aqua-200)",
            background:
              "linear-gradient(180deg, #ffffff, var(--aqua-50))",
          }}
        >
          <div className="mb-5 flex items-center gap-2.5">
            <span
              className="grid size-9 place-items-center rounded-xl"
              style={{ background: "var(--aqua-200)" }}
            >
              <Mic
                className="size-4.5"
                strokeWidth={2}
                style={{ color: "var(--navy)" }}
              />
            </span>
            <h3 className="text-lg font-bold">Gesproken via Dicteren.ai</h3>
            <span className="chip chip-green ml-auto">62 woorden</span>
          </div>
          <p className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4 text-[15px] leading-relaxed">
            “Schrijf een mail naar de huurder over het verzetten van de
            inspectie naar{" "}
            <mark
              className="rounded px-1"
              style={{
                background: "var(--orange-50)",
                color: "var(--orange-600)",
              }}
            >
              aanstaande dinsdag 10:00
            </mark>
            . Houd de toon{" "}
            <mark
              className="rounded px-1"
              style={{
                background: "var(--aqua-50)",
                color: "var(--navy)",
              }}
            >
              vriendelijk maar zakelijk
            </mark>
            , en verwijs naar onze afspraak van vorige week.”
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {spokenGood.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-[color:var(--navy)]"
              >
                <Check
                  className="size-4"
                  strokeWidth={2.4}
                  style={{ color: "var(--green)" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
