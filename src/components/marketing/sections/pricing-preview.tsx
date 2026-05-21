import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  title: string;
  price: string;
  sub: string;
  items: string[];
  cta: { label: string; href: string };
  best?: boolean;
};

const PLANS: Plan[] = [
  {
    title: "Maandelijks",
    price: "€12",
    sub: "per maand",
    items: ["Volledige dicteer-app", "Mac & Windows", "Modelupdates"],
    cta: { label: "Start gratis trial", href: "/auth/sign-up?next=/trial/start" },
  },
  {
    title: "Jaarlijks",
    price: "€96",
    sub: "per jaar · 33% korting",
    items: [
      "Alles uit Maandelijks",
      "Beste prijs voor consumenten",
      "Eén apparaat",
    ],
    cta: { label: "Start gratis trial", href: "/auth/sign-up?next=/trial/start" },
    best: true,
  },
  {
    title: "Zakelijk",
    price: "€84",
    sub: "per gebruiker / jaar",
    items: ["Teamlicenties", "Admin-dashboard", "Volumekorting vanaf 5"],
    cta: { label: "Vraag aan", href: "/zakelijk" },
  },
];

export function PricingPreviewSection() {
  return (
    <section className="px-6 py-20 lg:px-14 lg:py-24">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <span className="chip">Prijzen</span>
        <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
          Eerlijke prijs. Geen verrassingen.
        </h2>
        <p className="mt-3 text-base text-[color:var(--text-muted)]">
          Start gratis in de beta. Daarna kies je het abonnement dat past, of
          je stopt.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.title}
            className="brand-card relative p-7"
            style={
              plan.best
                ? {
                    border: "2px solid var(--orange)",
                    boxShadow: "var(--shadow-lg)",
                  }
                : undefined
            }
          >
            {plan.best && (
              <span
                className="absolute -top-3 left-6 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                style={{ background: "var(--orange)" }}
              >
                Aanbevolen
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.title}</h3>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight">
                {plan.price}
              </span>
              <span className="text-sm text-[color:var(--text-muted)]">
                {plan.sub}
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-2">
              {plan.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-[color:var(--text)]"
                >
                  <Check
                    className="size-4 shrink-0"
                    strokeWidth={2.4}
                    style={{ color: "var(--green)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={plan.cta.href}
              className={cn(
                "btn mt-5 w-full",
                plan.best ? "btn-primary" : "btn-secondary",
              )}
            >
              {plan.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-[color:var(--text-soft)]">
        Prijzen zijn indicatief tijdens beta. Eindprijzen kunnen wijzigen.
      </p>
    </section>
  );
}
