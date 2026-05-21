import {
  Briefcase,
  Handshake,
  Mail,
  MessageCircle,
} from "lucide-react";

export const metadata = { title: "Contact" };

const CHANNELS = [
  {
    icon: Mail,
    title: "Algemeen",
    desc: "Vragen, feedback of een eerste hallo.",
    href: "mailto:info@dicteren.ai",
    label: "info@dicteren.ai",
  },
  {
    icon: Briefcase,
    title: "Zakelijke beta",
    desc: "Teams en organisaties: licenties, DPA, demo.",
    href: "mailto:info@dicteren.ai?subject=Zakelijke%20beta%20aanvraag",
    label: "Vraag aan",
  },
  {
    icon: Handshake,
    title: "Partnership",
    desc: "Implementatie-partners, trainers, content creators.",
    href: "mailto:info@dicteren.ai?subject=Partnership%20aanvraag%20-%20Dicteren.ai",
    label: "Word partner",
  },
  {
    icon: MessageCircle,
    title: "Support",
    desc: "App werkt niet, model wil niet installeren, licentie-issue.",
    href: "mailto:info@dicteren.ai?subject=Support%20-%20Dicteren.ai",
    label: "Stuur ticket",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-14">
        <span className="chip">Contact</span>
        <h1 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Laten we praten.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          We zijn een klein team. Eén centraal mailadres, korte lijnen.
        </p>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.title}
                href={c.href}
                className="brand-card group flex items-start gap-4 p-6 transition-transform hover:-translate-y-0.5"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-2xl"
                  style={{ background: "var(--aqua-50)" }}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={1.8}
                    style={{ color: "var(--navy)" }}
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {c.desc}
                  </p>
                  <span className="mt-2 inline-block text-sm font-semibold text-[color:var(--navy-500)] group-hover:text-[color:var(--navy)]">
                    {c.label}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        <p className="mx-auto mt-9 max-w-xl text-center text-sm text-[color:var(--text-soft)]">
          Reactie binnen één werkdag.
        </p>
      </section>
    </>
  );
}
