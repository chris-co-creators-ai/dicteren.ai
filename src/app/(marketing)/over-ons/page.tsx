import Image from "next/image";
import Link from "next/link";
import { Mic } from "lucide-react";

export const metadata = { title: "Over ons" };

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function OverOnsPage() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-14 lg:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="chip">Over ons</span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl">
            Het verhaal achter Dicteren.ai
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
            Een Nederlands product, gebouwd voor mensen die meer willen
            vertellen dan ze kunnen typen. Je stem blijft op je eigen computer.
          </p>
        </div>

        {/* Founder-card */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-white shadow-sm sm:flex">
          <div className="relative h-72 w-full shrink-0 sm:h-auto sm:w-64">
            <Image
              src="/team/christian-bleeker.jpg"
              alt="Christian Bleeker"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 256px"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <div className="text-xl font-bold text-[color:var(--navy)]">
              Christian Bleeker
            </div>
            <div className="mt-1 text-sm font-medium text-[color:var(--text-muted)]">
              Oprichter van Dicteren.ai
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--text-muted)]">
              Christian bouwt Dicteren.ai vanuit Nederland. Hij sprak op
              TEDxEindhoven. Hij wil dat je je woorden gewoon uitspreekt in
              plaats van ze te typen.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: "var(--orange-50)", color: "var(--orange-600)" }}
              >
                <Mic className="size-3.5" strokeWidth={2.2} />
                TEDxEindhoven
              </span>
              <Link
                href="https://www.linkedin.com/in/christianbleeker/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--navy)] hover:bg-[color:var(--bg)]"
              >
                <LinkedInIcon className="size-3.5" />
                LinkedIn
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
