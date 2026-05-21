import Link from "next/link";
import { LogIn, Mail } from "lucide-react";

export const metadata = { title: "Inloggen" };

export default function LoginPage() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14 lg:py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="chip">Klant-login</span>
          <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl">
            Welkom terug.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] sm:text-lg">
            Tijdens de beta hoef je niet in te loggen. Je activeert Dicteren.ai
            direct met je beta-code in de app. Het klant-portaal voor je
            licenties en facturen komt bij de publieke release online.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/download" className="btn btn-primary btn-lg">
              <LogIn className="size-4" strokeWidth={2.2} />
              Activeer in de app
            </Link>
            <a
              href="mailto:info@dicteren.ai?subject=Hulp%20bij%20inloggen%20-%20Dicteren.ai"
              className="btn btn-secondary btn-lg"
            >
              <Mail className="size-4" strokeWidth={2.2} />
              Hulp nodig?
            </a>
          </div>
        </div>

        <div
          className="rounded-3xl border border-[color:var(--border-soft)] p-7 sm:p-9"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-[0.05em]"
            style={{ color: "var(--orange)" }}
          >
            Komt binnenkort
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Klant-portaal
          </h2>
          <ul className="mt-5 flex flex-col gap-3 text-sm text-[color:var(--text-muted)]">
            {[
              "Bekijk je actieve licenties en apparaten",
              "Beheer team-zitplaatsen en uitnodigingen",
              "Download facturen en kwitanties",
              "Wijzig je facturatie-gegevens",
              "Je gedicteerde teksten blijven op je eigen computer, niet hier",
            ].map((item) => (
              <li
                key={item}
                className="flex gap-2 border-b border-[color:var(--border-soft)] pb-3 last:border-b-0"
              >
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--orange)" }}
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
