import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AUDIENCE_LIST } from "@/lib/audiences";

export const metadata = {
  title: "Voor wie",
  description:
    "Specifieke werkwijzen per beroep: van ondernemers tot advocaten, zorgprofessionals tot mensen met dyslexie of typstrain.",
};

export default function VoorWieIndexPage() {
  return (
    <>
      <section className="px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-14">
        <span className="chip">Voor wie</span>
        <h1 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl lg:text-6xl">
          Hoe het werkt voor jouw beroep.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          Tien doelgroepen, tien manieren om Dicteren.ai in je werkdag te
          gebruiken. Klik door naar je situatie.
        </p>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-14">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCE_LIST.map((a) => (
            <Link
              key={a.slug}
              href={`/voor-wie/${a.slug}`}
              className="brand-card group block p-6 transition-transform hover:-translate-y-0.5"
            >
              <span className="chip">{a.chip}</span>
              <h3 className="mt-4 text-xl font-bold leading-tight tracking-tight">
                {a.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-muted)]">
                {a.subtitle}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--navy-500)] group-hover:text-[color:var(--navy)]">
                Bekijk werkwijze
                <ArrowRight className="size-3.5" strokeWidth={2.2} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
