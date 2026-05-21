import Link from "next/link";
import {
  ArrowRight,
  Apple,
  Key,
  Mic,
  Monitor,
  RefreshCw,
  Settings,
} from "lucide-react";

export const metadata = { title: "Help" };

const TOPICS = [
  {
    icon: Apple,
    title: "Installeren op Mac",
    desc: "Stap voor stap door de installatie en eerste opzet.",
    href: "/help/installeren-mac",
  },
  {
    icon: Monitor,
    title: "Installeren op Windows",
    desc: "Installatie en troubleshooting voor Windows 10 en hoger.",
    href: "/help/installeren-windows",
  },
  {
    icon: Mic,
    title: "Microfoon-toegang",
    desc: "Toestemming geven aan de microfoon op Mac en Windows.",
    href: "/help/microfoon-toegang",
  },
  {
    icon: Settings,
    title: "Toegankelijkheid op Mac",
    desc: "Waarom dit nodig is en hoe je het instelt.",
    href: "/help/toegankelijkheid-toegang-mac",
  },
  {
    icon: RefreshCw,
    title: "Model downloaden of opnieuw installeren",
    desc: "Wanneer en hoe je het V3-model verwijdert en opnieuw download.",
    href: "/help/model-downloaden",
  },
  {
    icon: Key,
    title: "Licentie activeren",
    desc: "Beta-code invoeren of een betaalde licentie activeren.",
    href: "/help/licentie-activeren",
  },
];

export default function HelpIndexPage() {
  return (
    <>
      <section className="px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-14">
        <span className="chip">Help</span>
        <h1 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Hulp bij installeren en gebruiken.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Korte artikelen voor de meestgestelde technische vragen.
        </p>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="brand-card group block p-5 transition-transform hover:-translate-y-0.5"
              >
                <span
                  className="mb-3 inline-grid size-10 place-items-center rounded-xl"
                  style={{ background: "var(--orange-50)" }}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={1.8}
                    style={{ color: "var(--orange-600)" }}
                  />
                </span>
                <h3 className="text-[15px] font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  {t.desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--navy-500)] group-hover:text-[color:var(--navy)]">
                  Lees artikel
                  <ArrowRight className="size-3" strokeWidth={2.2} />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mx-auto mt-9 max-w-2xl text-center text-sm text-[color:var(--text-muted)]">
          Mis je een onderwerp?{" "}
          <Link
            href="/contact"
            className="font-semibold text-[color:var(--navy-500)] underline-offset-4 hover:underline"
          >
            Stuur ons een bericht
          </Link>
          .
        </div>
      </section>
    </>
  );
}
