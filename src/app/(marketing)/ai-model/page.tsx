import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-model — Dicteren.ai",
  description:
    "Welk AI-model Dicteren.ai gebruikt voor spraakherkenning, met bronvermelding en licentie.",
  // Geen prominente vermelding op homepage; pagina blijft wel openbaar
  // vindbaar voor wie ernaar zoekt en voor zoekmachines.
  robots: { index: true, follow: true },
};

export default function AiModelPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <header className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          Transparantie
        </span>
        <h1
          className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
          style={{ color: "var(--navy)" }}
        >
          Het AI-model achter Dicteren.ai
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[color:var(--text-muted)]">
          We zijn open over de techniek waar Dicteren.ai op draait. Hieronder
          staat welk model we gebruiken, waar het vandaan komt, en wat het wel
          en niet doet.
        </p>
      </header>

      <section className="mb-10">
        <h2
          className="mb-3 text-xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          Welk model
        </h2>
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6">
          <dl className="grid gap-3 text-sm">
            <Row label="Model" value="Parakeet TDT 0.6B v3" />
            <Row label="Maker" value="NVIDIA Corporation" />
            <Row label="Parameters" value="600 miljoen" />
            <Row
              label="Bron"
              value={
                <a
                  href="https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium underline"
                  style={{ color: "var(--navy)" }}
                >
                  huggingface.co/nvidia/parakeet-tdt-0.6b-v3
                </a>
              }
            />
            <Row
              label="Licentie"
              value={
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium underline"
                  style={{ color: "var(--navy)" }}
                >
                  CC-BY-4.0
                </a>
              }
            />
            <Row label="Wijzigingen door Dicteren.ai" value="Geen. We draaien het model ongewijzigd." />
            <Row label="Verwerkingslocatie" value="Lokaal op het apparaat van de gebruiker" />
          </dl>
        </div>
      </section>

      <section className="mb-10">
        <h2
          className="mb-3 text-xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          Wat het model doet
        </h2>
        <p className="text-sm leading-relaxed text-[color:var(--text-muted)]">
          Parakeet TDT 0.6B v3 zet gesproken audio om in tekst. Het ondersteunt
          25 Europese talen, waaronder Nederlands. NVIDIA heeft het model
          getraind op publieke datasets, onder andere Mozilla Common Voice,
          Multilingual LibriSpeech en Europarl-ASR.
        </p>
      </section>

      <section className="mb-10">
        <h2
          className="mb-3 text-xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          Wat het model NIET doet
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
          <li>
            <strong className="font-semibold text-[color:var(--text)]">Geen sprekerherkenning.</strong>{" "}
            Het model maakt geen onderscheid tussen stemmen en identificeert
            geen personen. NVIDIA bevestigt dit expliciet in de model card.
          </li>
          <li>
            <strong className="font-semibold text-[color:var(--text)]">Geen biometrische identificatie.</strong>{" "}
            Stem-eigenschappen worden niet omgezet in een voiceprint of
            koppeling aan een persoon.
          </li>
          <li>
            <strong className="font-semibold text-[color:var(--text)]">Geen emotion-recognition.</strong>{" "}
            Toon, emotie of intentie worden niet geanalyseerd.
          </li>
          <li>
            <strong className="font-semibold text-[color:var(--text)]">Geen cloud-verwerking.</strong>{" "}
            Audio en transcripten blijven op het apparaat van de gebruiker.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2
          className="mb-3 text-xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          Beperkingen
        </h2>
        <p className="text-sm leading-relaxed text-[color:var(--text-muted)]">
          Geen enkel spraakherkenningsmodel is foutloos. De nauwkeurigheid
          hangt af van de taal, het accent, achtergrondgeluid en de context.
          Voor losse woorden of onvolledige zinnen kan de uitkomst minder
          accuraat zijn dan voor volzinnen. Controleer de tekst altijd voor je
          hem verstuurt.
        </p>
      </section>

      <section className="mb-10">
        <h2
          className="mb-3 text-xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          Onze rol onder de EU AI Act
        </h2>
        <p className="text-sm leading-relaxed text-[color:var(--text-muted)]">
          Onder de EU AI Act (Verordening 2024/1689) is Dicteren.ai
          geclassificeerd als <strong className="font-semibold text-[color:var(--text)]">minimaal risico</strong>.
          We zijn provider van het AI-systeem &quot;Dicteren.ai&quot;. NVIDIA is
          de provider van het onderliggende ASR-model. We doen geen verboden
          praktijken (Art. 5) en vallen niet onder een van de high-risk
          domeinen (Annex III).
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-muted)]">
          Voor klanten die Dicteren.ai willen inzetten in een high-risk
          context — bijvoorbeeld voor besluitvorming over essentiële
          publieke diensten, kredietbeoordeling, of werving en selectie —
          gelden aanvullende verplichtingen voor de gebruikende organisatie
          (deployer-rol, Art. 26-29 AI Act). Neem in dat geval{" "}
          <Link
            href="/contact"
            className="font-medium underline"
            style={{ color: "var(--navy)" }}
          >
            contact
          </Link>{" "}
          op.
        </p>
      </section>

      <section className="mb-10">
        <h2
          className="mb-3 text-xl font-bold tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          Bronvermelding
        </h2>
        <p className="text-sm leading-relaxed text-[color:var(--text-muted)]">
          Conform de CC-BY-4.0 licentie: dit model is gemaakt door NVIDIA
          Corporation. Wij gebruiken het ongewijzigd onder de voorwaarden van
          de Creative Commons Attribution 4.0 International licentie.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-muted)]">
          Modelnaam:{" "}
          <code className="rounded bg-[color:var(--bg)] px-1.5 py-0.5 font-mono text-xs">
            nvidia/parakeet-tdt-0.6b-v3
          </code>
          .
        </p>
      </section>

      <p className="mt-12 text-xs text-[color:var(--text-soft)]">
        Vragen? Mail{" "}
        <a
          href="mailto:info@dicteren.ai"
          className="underline hover:text-[color:var(--navy)]"
        >
          info@dicteren.ai
        </a>
        . Voor je rechten rond persoonsgegevens zie de{" "}
        <Link href="/privacy" className="underline hover:text-[color:var(--navy)]">
          privacyverklaring
        </Link>
        .
      </p>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-[color:var(--border-soft)] pb-3 last:border-0 last:pb-0 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[color:var(--text)]">{value}</dd>
    </div>
  );
}
