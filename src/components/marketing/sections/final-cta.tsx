import Link from "next/link";
import { Download } from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden px-6 py-20 text-center lg:px-14 lg:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, var(--aqua-50), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-xl">
        <LogoIcon size={88} className="mx-auto" />
        <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
          Typ minder. Vertel meer.
        </h2>
        <p className="mt-4 text-base text-[color:var(--text-muted)] lg:text-lg">
          Gratis te proberen tijdens de beta. Geen creditcard nodig.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/download" className="btn btn-primary btn-lg">
            <Download className="size-4" />
            Download gratis beta
          </Link>
          <Link href="/prijzen" className="btn btn-secondary btn-lg">
            Zie prijzen
          </Link>
        </div>
      </div>
    </section>
  );
}
