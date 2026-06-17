// Dicteren.ai — Reseller-deck (het wervings-verhaal op /partner/[token]).
//
// CONCEPT-copy. B1, TOV-conform, alleen app-truth-feiten (lokaal, Nederlands,
// werkt in elke app, terugkerende commissie, vriendenprijs). BEWUST GEEN
// cijfer-claims (spreken vs typen) en GEEN Wispr-vergelijking: die vereisen de
// wetenschap-/concurrent-bronnen + Christians akkoord via de copy-gate. De
// finale wervingstekst, de founder-bio en de cijfers vult Christian aan. Dit is
// de werkende structuur met veilige placeholder-tekst.

import { Lock, Globe, Repeat, MessageSquareText } from "lucide-react";

export function PartnerDeck({
  firstName,
  audience,
}: {
  firstName?: string | null;
  audience?: string | null;
}) {
  const hi = firstName ? `Hoi ${firstName}` : "Hoi";
  const forWhom = audience ? audience : "jouw klanten";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      {/* 1 — Hero */}
      <section className="text-center">
        <span className="chip">Partnerprogramma</span>
        <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl">
          {hi}, word partner van Dicteren.ai.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[color:var(--text-muted)]">
          Een Nederlandse AI-tool die je met een gerust hart aanraadt aan{" "}
          {forWhom}. Lokaal op het apparaat, dus de data blijft thuis.
        </p>
        <a
          href="#aanmelden"
          className="btn btn-primary mt-7 inline-flex justify-center"
        >
          Ja, ik wil partner worden
        </a>
      </section>

      {/* 2 — Wat het is */}
      <section className="mt-16">
        <Block
          icon={<Globe className="size-5" strokeWidth={1.8} />}
          title="Nederlandse spraak naar tekst"
          body="Praten, en het staat er. In Word, in de mail, in WhatsApp Web. Het model draait lokaal op de computer van je klant, geen cloud."
        />
      </section>

      {/* 3 — Waarom dit voor je klanten */}
      <section className="mt-8">
        <Block
          icon={<Lock className="size-5" strokeWidth={1.8} />}
          title="Privacy als uitgangspunt"
          body="De stem en de tekst blijven op het apparaat. Voor klanten in de zorg, het recht of bij de overheid is dat het verschil tussen wel of niet mogen."
        />
      </section>

      {/* 4 — Wat jij eraan hebt */}
      <section className="mt-8">
        <Block
          icon={<Repeat className="size-5" strokeWidth={1.8} />}
          title="Terugkerende commissie"
          body="Op elke klant die via jou binnenkomt, zolang die klant blijft. Plus een vriendenprijs voor jezelf en je eigen team."
        />
      </section>

      {/* 5 — Hoe het werkt */}
      <section className="mt-8">
        <Block
          icon={<MessageSquareText className="size-5" strokeWidth={1.8} />}
          title="Korte lijnen"
          body="Klein team, je hebt een vaste contactpersoon. We helpen je op weg en denken mee over je klanten."
        />
      </section>

      {/* 6 — Sluit-zin */}
      <section className="mt-16 text-center">
        <p className="text-xl font-semibold text-[color:var(--navy)]">
          Bouw mee aan het Nederlandse alternatief.
        </p>
      </section>
    </div>
  );
}

function Block({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="brand-card flex gap-4 p-6">
      <span
        className="inline-grid size-11 shrink-0 place-items-center rounded-2xl"
        style={{ background: "var(--aqua-50)", color: "var(--navy)" }}
      >
        {icon}
      </span>
      <div>
        <h3 className="text-lg font-bold leading-tight text-[color:var(--navy)]">
          {title}
        </h3>
        <p className="mt-1.5 text-[color:var(--text-muted)]">{body}</p>
      </div>
    </article>
  );
}
