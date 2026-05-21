import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";

type Props = {
  chip?: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

export function PagePlaceholder({
  chip,
  title,
  description,
  backHref = "/",
  backLabel = "Terug naar de homepage",
}: Props) {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-14 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <span
          className="inline-flex size-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--orange-50)" }}
        >
          <Construction
            className="size-6"
            strokeWidth={1.8}
            style={{ color: "var(--orange-600)" }}
          />
        </span>
        {chip && <div className="mt-5"><span className="chip">{chip}</span></div>}
        <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--navy)] sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
          {description}
        </p>
        <Link
          href={backHref}
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
        >
          {backLabel}
          <ArrowRight className="size-3.5" strokeWidth={2.2} />
        </Link>
      </div>
    </section>
  );
}
