import Link from "next/link";
import { Briefcase, Handshake, Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Contact" };

const QUICK_LINKS = [
  {
    icon: Briefcase,
    title: "Direct zakelijke licenties",
    desc: "Geen demo nodig — start meteen voor je team.",
    href: "/zakelijk/start?plan=org-yearly&seats=5",
    label: "Start nu",
    accent: true,
  },
  {
    icon: Handshake,
    title: "Reseller-partner worden",
    desc: "Verkoop Dicteren.ai door en verdien commissie.",
    href: "/word-partner",
    label: "Aanmelden",
  },
  {
    icon: MessageCircle,
    title: "Support",
    desc: "App werkt niet, model installeren, licentie-issue.",
    href: "mailto:info@dicteren.ai?subject=Support",
    label: "Mail support",
  },
  {
    icon: Mail,
    title: "Algemeen",
    desc: "Vragen, feedback, eerste hallo.",
    href: "mailto:info@dicteren.ai",
    label: "info@dicteren.ai",
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
          Voor specifieke verzoeken hieronder de korte route. Voor de rest:
          gebruik het formulier — reactie binnen één werkdag.
        </p>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-14">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((c) => {
            const Icon = c.icon;
            const isExternal = c.href.startsWith("mailto:");
            const Wrap = isExternal ? "a" : Link;
            return (
              <Wrap
                key={c.title}
                {...(isExternal ? { href: c.href } : { href: c.href })}
                className={`brand-card group flex flex-col gap-2 p-5 transition-transform hover:-translate-y-0.5 ${
                  c.accent ? "ring-2 ring-[color:var(--orange)]" : ""
                }`}
              >
                <span
                  className="grid size-10 place-items-center rounded-xl"
                  style={{
                    background: c.accent
                      ? "var(--orange)"
                      : "var(--aqua-50, color-mix(in srgb, var(--aqua) 18%, white))",
                  }}
                >
                  <Icon
                    className="size-4"
                    strokeWidth={2}
                    style={{ color: c.accent ? "white" : "var(--navy)" }}
                  />
                </span>
                <div>
                  <div className="text-sm font-bold">{c.title}</div>
                  <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                    {c.desc}
                  </div>
                </div>
                <span className="mt-auto text-xs font-semibold text-[color:var(--navy-500)] group-hover:text-[color:var(--navy)]">
                  {c.label} →
                </span>
              </Wrap>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight">
            Stuur ons een bericht
          </h2>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            We lezen ieder bericht. Voor verkoop, support en algemene vragen.
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
