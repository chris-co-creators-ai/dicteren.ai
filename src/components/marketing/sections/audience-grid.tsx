import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Receipt,
  Scale,
  Stethoscope,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AudienceCard = {
  icon: LucideIcon;
  title: string;
  desc: string;
  bg: string;
  href: string;
};

const AUDIENCES: AudienceCard[] = [
  {
    icon: Briefcase,
    title: "Ondernemers",
    desc: "Concepten en briefings sneller dan typen.",
    bg: "var(--aqua-50)",
    href: "/voor-wie/ondernemers",
  },
  {
    icon: Scale,
    title: "Advocaten",
    desc: "Notities en dossiers vastleggen.",
    bg: "var(--orange-50)",
    href: "/voor-wie/advocaten",
  },
  {
    icon: Stethoscope,
    title: "Zorgprofessionals",
    desc: "Rapportages na consult.",
    bg: "var(--aqua-50)",
    href: "/voor-wie/zorgprofessionals",
  },
  {
    icon: Heart,
    title: "Coaches & therapeuten",
    desc: "Sessieverslagen op je manier.",
    bg: "var(--bg-deep)",
    href: "/voor-wie/coaches-therapeuten",
  },
  {
    icon: Receipt,
    title: "Accountants",
    desc: "Memo's en mails uitspreken.",
    bg: "var(--orange-50)",
    href: "/voor-wie/accountants-administratie",
  },
  {
    icon: Home,
    title: "Makelaars",
    desc: "Bezichtigingsnotities onderweg.",
    bg: "var(--aqua-50)",
    href: "/voor-wie/makelaars",
  },
  {
    icon: Users,
    title: "Recruiters & HR",
    desc: "Intakegesprekken vastleggen.",
    bg: "var(--bg-deep)",
    href: "/voor-wie/recruiters-hr",
  },
  {
    icon: GraduationCap,
    title: "Studenten",
    desc: "Aantekeningen en samenvattingen.",
    bg: "var(--aqua-50)",
    href: "/voor-wie/studenten-onderzoekers",
  },
];

export function AudienceGridSection() {
  return (
    <section className="px-6 py-20 lg:px-14 lg:py-24">
      <div className="mx-auto mb-9 flex max-w-7xl items-end justify-between gap-4">
        <div>
          <span className="chip">Voor wie</span>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            Voor wie elke dag schrijft.
          </h2>
        </div>
        <Link
          href="/voor-wie/ondernemers"
          className="hidden items-center gap-1.5 text-sm font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)] sm:inline-flex"
        >
          Alle doelgroepen
          <ArrowRight className="size-3.5" strokeWidth={2.2} />
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCES.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              href={a.href}
              className="brand-card p-5 transition-transform hover:-translate-y-0.5"
            >
              <span
                className="mb-3.5 inline-grid size-11 place-items-center rounded-xl"
                style={{ background: a.bg }}
              >
                <Icon
                  className="size-5.5"
                  strokeWidth={1.8}
                  style={{ color: "var(--navy)" }}
                />
              </span>
              <h4 className="text-base font-semibold">{a.title}</h4>
              <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-muted)]">
                {a.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
