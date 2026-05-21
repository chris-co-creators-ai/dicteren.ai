import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { AdminTopbar } from "./admin-topbar";

type Props = {
  title: string;
  description: string;
};

export function AdminPlaceholder({ title, description }: Props) {
  return (
    <>
      <AdminTopbar />
      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
          >
            <ArrowLeft className="size-3" strokeWidth={2.4} />
            Terug naar overzicht
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            {title}
          </h1>
        </div>

        <div className="brand-card flex flex-col items-start gap-3 p-7 sm:flex-row sm:items-center sm:gap-6">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl"
            style={{ background: "var(--orange-50)" }}
          >
            <Construction
              className="size-5"
              strokeWidth={1.8}
              style={{ color: "var(--orange-600)" }}
            />
          </span>
          <div>
            <h2 className="text-base font-bold">In ontwikkeling</h2>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-muted)]">
              {description}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
