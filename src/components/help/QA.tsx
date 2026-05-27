import { type ReactNode } from "react";

export function QA({
  q,
  children,
}: {
  q: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b py-5" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-base font-bold text-[color:var(--navy)] sm:text-lg">
        {q}
      </h3>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-[color:var(--text)]">
        {children}
      </div>
    </div>
  );
}

export function Section({
  id,
  number,
  title,
  intro,
  children,
}: {
  id: string;
  number: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 place-items-center rounded-full text-sm font-bold text-white sm:size-10"
          style={{ background: "var(--navy)" }}
        >
          {number}
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--navy)] sm:text-3xl">
          {title}
        </h2>
      </div>
      {intro && (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[color:var(--text-muted)]">
          {intro}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
