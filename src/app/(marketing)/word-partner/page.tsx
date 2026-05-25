import Link from "next/link";
import { Check, Handshake, TrendingUp, Users } from "lucide-react";
import { PartnerForm } from "./partner-form";

export const metadata = {
  title: "Word reseller-partner · Dicteren.ai",
  description:
    "Verkoop Dicteren.ai door aan je netwerk en verdien commissie op elke licentie. Geen plafond, lifetime attributie.",
};

const PILLARS = [
  {
    icon: TrendingUp,
    title: "Commissie op elke order",
    desc: "Vast percentage of vast bedrag per seat. Jij of wij stellen het in.",
  },
  {
    icon: Users,
    title: "Lifetime attributie",
    desc: "Klanten via jouw link of code blijven aan jou gekoppeld — ook bij verlengingen.",
  },
  {
    icon: Handshake,
    title: "Eigen partner-dashboard",
    desc: "Realtime inzicht in referrals, commissies en uitbetalingen.",
  },
];

export default function WordPartnerPage() {
  return (
    <>
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="chip chip-navy">Reseller-programma</span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
            Verkoop Dicteren.ai door, verdien per licentie.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[color:var(--text-muted)] sm:text-lg">
            Voor consultants, trainers, IT-resellers en netwerken die teams
            naar lokale dicteer-software willen brengen. Eigen link, eigen
            kortingscode, eigen dashboard.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="brand-card p-5">
                <span
                  className="grid size-10 place-items-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--aqua) 18%, white)",
                  }}
                >
                  <Icon
                    className="size-4"
                    strokeWidth={2}
                    style={{ color: "var(--navy)" }}
                  />
                </span>
                <h3 className="mt-3 text-base font-bold">{p.title}</h3>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-14">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Hoe het werkt</h2>
            <ol className="mt-4 space-y-3 text-sm text-[color:var(--text-muted)]">
              {[
                "Vul het formulier in met je bedrijfsgegevens en wat je doet.",
                "Wij beoordelen je aanmelding binnen 2 werkdagen.",
                "Bij goedkeuring krijg je een affiliate-code + login voor je dashboard.",
                "Deel je link of kortingscode met je netwerk.",
                "Elke paid order = commissie op je dashboard. Maandelijks uitbetaald.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold"
                    style={{
                      background: "var(--navy)",
                      color: "white",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            <div className="mt-7 rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
              <h3 className="text-sm font-bold">Standaard commissie</h3>
              <ul className="mt-3 grid gap-2 text-sm text-[color:var(--text-muted)]">
                {[
                  "20% op het eerste jaar van elke order",
                  "10% op alle verlengingen (lifetime)",
                  "Of vast bedrag per seat — bespreek dat met ons",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 size-3.5"
                      strokeWidth={2.4}
                      style={{ color: "var(--green)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[color:var(--text-soft)]">
                Maatwerk-percentage mogelijk bij grote partners.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Meld je aan als partner
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Vul deze gegevens in. We nemen binnen 2 werkdagen contact op met
              de status van je aanmelding.
            </p>
            <PartnerForm />
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div className="mx-auto max-w-3xl text-center text-sm text-[color:var(--text-muted)]">
          Vragen over het partnerprogramma? Mail{" "}
          <Link href="mailto:partner@dicteren.ai" className="underline">
            partner@dicteren.ai
          </Link>
          .
        </div>
      </section>
    </>
  );
}
