import Link from "next/link";
import {
  Building2,
  Check,
  Layers,
  Receipt,
  Shield,
  Users,
} from "lucide-react";

const PILLARS = [
  {
    icon: Users,
    title: "Eén factuur",
    desc: "Alle licenties op één rekening. Voeg mensen toe of verwijder ze per maand.",
  },
  {
    icon: Layers,
    title: "Beheer per afdeling",
    desc: "Geef toegang per team. Stel rollen in en bewaak het gebruik.",
  },
  {
    icon: Shield,
    title: "Privé als beginsel",
    desc: "Lokale verwerking. DPA en SCC op aanvraag, klaar voor inkoop.",
  },
  {
    icon: Receipt,
    title: "Hulp dichtbij",
    desc: "Inkoop-PO, facturatie per kwartaal en snelle support.",
  },
];

const DISCOUNT_TIERS: { range: string; price: string; pct: string; popular?: boolean }[] = [
  { range: "1 tot 4 zitplaatsen", price: "€84", pct: "0%" },
  { range: "5 tot 9 zitplaatsen", price: "€76", pct: "10%" },
  { range: "10 tot 24 zitplaatsen", price: "€71", pct: "15%", popular: true },
  { range: "25 tot 49 zitplaatsen", price: "€67", pct: "20%" },
  { range: "50 of meer zitplaatsen", price: "op maat", pct: "maatwerk" },
];

const TEAM_PREVIEW = [
  { name: "Jeroen Smit", role: "Partner", devices: "2 apparaten", status: "Actief" as const },
  { name: "Lisa Veenstra", role: "Senior associate", devices: "1 apparaat", status: "Actief" as const },
  { name: "Wessel Bos", role: "Junior associate", devices: "wacht op activatie", status: "Uitgenodigd" as const },
];

const KPIS = [
  { label: "Actieve licenties", value: "14 / 18" },
  { label: "Activaties deze week", value: "23" },
  { label: "Modelinstallaties", value: "14/14" },
];

export const metadata = {
  title: "Zakelijk",
  description:
    "Dicteren voor teams en organisaties. Eén dashboard, één factuur en lokale verwerking. Met DPA en inkoop-PO op aanvraag.",
};

export default function ZakelijkPage() {
  return (
    <>
      {/* Hero + admin preview */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <span className="chip chip-navy">Voor teams en organisaties</span>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
              Beter geschreven werk, voor het hele team.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
              Dicteren in elke app waar je team werkt. Notities, mails,
              dossiers en AI-prompts. Eén dashboard, één factuur. Audio blijft
              op het apparaat van je collega.
            </p>
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/contact" className="btn btn-primary btn-lg">
                Vraag zakelijke beta aan
              </Link>
              <Link href="/contact" className="btn btn-secondary btn-lg">
                Plan een demo
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--text-muted)]">
              {["Inkoop-PO", "Volumekorting", "Privacy-DPA"].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check
                    className="size-3.5"
                    strokeWidth={2.4}
                    style={{ color: "var(--green)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Admin preview card */}
          <div
            className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div
              className="flex items-center gap-2.5 border-b border-[color:var(--border-soft)] px-4 py-3 text-sm"
              style={{ background: "var(--bg-deep)" }}
            >
              <Building2
                className="size-3.5"
                strokeWidth={1.8}
                style={{ color: "var(--navy)" }}
              />
              <span className="font-semibold">Boom Advocaten · Admin</span>
              <span className="ml-auto font-mono text-[0.6875rem] text-[color:var(--text-soft)]">
                14 zitplaatsen actief
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 p-5">
              {KPIS.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl p-3.5"
                  style={{ background: "var(--bg)" }}
                >
                  <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                    {kpi.label}
                  </div>
                  <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              {TEAM_PREVIEW.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 border-t border-[color:var(--border-soft)] py-3"
                >
                  <div
                    className="grid size-8 place-items-center rounded-full text-xs font-bold"
                    style={{ background: "var(--aqua-200)", color: "var(--navy)" }}
                  >
                    {p.name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                      {p.role} · {p.devices}
                    </div>
                  </div>
                  <span
                    className={`chip shrink-0 px-2 py-0.5 text-[0.625rem] ${
                      p.status === "Actief" ? "chip-green" : "chip-orange"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-[color:var(--border-soft)] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Voor IT, finance en de mensen die ermee werken.
        </h2>
        <div className="mx-auto mt-8 grid max-w-6xl gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="brand-card p-5">
                <span
                  className="mb-3.5 inline-grid size-10 place-items-center rounded-xl"
                  style={{ background: "var(--aqua-50)" }}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={1.8}
                    style={{ color: "var(--navy)" }}
                  />
                </span>
                <h4 className="text-base font-semibold">{pillar.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Volume discount */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="chip">Volumekorting</span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Hoe meer collega&apos;s, hoe scherper de prijs.
              </h2>
            </div>
            <Link href="/prijzen" className="btn btn-secondary">
              Open de calculator
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {DISCOUNT_TIERS.map((tier) => (
              <div
                key={tier.range}
                className="brand-card relative p-5"
                style={
                  tier.popular
                    ? { borderColor: "var(--orange)" }
                    : undefined
                }
              >
                {tier.popular && (
                  <span
                    className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[0.625rem] font-bold text-white"
                    style={{ background: "var(--orange)" }}
                  >
                    POPULAIR
                  </span>
                )}
                <div className="text-xs font-semibold text-[color:var(--text-muted)]">
                  {tier.range}
                </div>
                <div className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
                  {tier.price}
                </div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  per gebruiker / jaar
                </div>
                <div
                  className="mt-2 text-xs font-semibold"
                  style={{ color: "var(--orange-600)" }}
                >
                  Korting: {tier.pct}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-4 py-16 text-center text-white sm:px-6 sm:py-20 lg:px-14"
        style={{ background: "var(--navy)" }}
      >
        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          Klaar voor jouw team?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-[#bccbed]">
          Plan een korte demo van 20 minuten of vraag direct een zakelijke beta
          aan.
        </p>
        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/contact" className="btn btn-primary btn-lg">
            Vraag zakelijke beta aan
          </Link>
          <Link
            href="/contact"
            className="btn btn-lg"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            Plan een demo
          </Link>
        </div>
      </section>
    </>
  );
}
