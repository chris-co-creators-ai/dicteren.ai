// De vier vragen die de bezoeker al in z'n hoofd heeft, in denk-volgorde:
// angst (data) → praktisch (internet) → vergelijking (Wispr) → bewijs (sneller).
// Concurrent-claims: zie .claude/docs/copy/concurrent-claims-wispr.md
// Cijfer-claims: zie .claude/docs/wetenschap/samenvatten/bronnen.md

const QUESTIONS: { q: string; a: string[] }[] = [
  {
    q: "Gaat mijn data naar Amerika?",
    a: [
      "Nee. Je stem en je tekst blijven op jouw computer. Wij ontvangen ze nooit.",
    ],
  },
  {
    q: "Heb ik internet nodig?",
    a: ["Nee. Het model draait lokaal. In de trein, op kantoor, overal."],
  },
  {
    q: "Is dit hetzelfde als Wispr Flow, waar elke AI-expert het nu over heeft?",
    a: [
      "Nee. Wispr Flow stuurt je stem naar de cloud. Eén dictaat passeert daar zes AI-bedrijven, waaronder OpenAI en Anthropic. Standaard verbetert jouw tekst ook hun model, tot je dat zelf uitzet. Hun analytics kún je niet eens uitzetten.",
      "Dicteren.ai doet het andersom. Het model draait op jouw computer. Je stem en je tekst verlaten hem niet. Er valt niets uit te zetten, want er staat niets aan.",
    ],
  },
  {
    q: "Hoeveel sneller is praten dan?",
    a: [
      "Je spreekt 150 woorden per minuut. Wie typt en zelf formuleert, haalt er hooguit 30. Onderzoekers van Stanford University toonden in 2016 aan dat spreken 3 keer sneller is dan typen.",
      "En dat gat kost je meer dan tijd. Je brein kort je gedachten in zodat je vingers het bijhouden, zonder dat je het doorhebt. Praat je je tekst in, dan staat alles er. Daarom is een gedicteerde prompt aan Claude of ChatGPT completer dan een getypte.",
    ],
  },
];

export function ReaderQuestionsSection() {
  return (
    <section className="px-6 py-16 lg:px-14 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 md:grid-cols-2">
        {QUESTIONS.map((item) => (
          <div key={item.q}>
            <h3 className="text-lg font-bold leading-snug text-[color:var(--navy)] lg:text-xl">
              {`"${item.q}"`}
            </h3>
            {item.a.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="mt-3 text-[15px] leading-relaxed text-[color:var(--text-muted)]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
