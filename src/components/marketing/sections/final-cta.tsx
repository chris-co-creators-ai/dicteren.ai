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
          Probeer Dicteren.ai 14 dagen gratis. Geen creditcard nodig.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/auth/sign-up?next=/trial/start"
            className="btn btn-primary btn-lg"
          >
            <Download className="size-4" />
            Probeer 14 dagen gratis
          </Link>
          <Link href="/prijzen" className="btn btn-secondary btn-lg">
            Bekijk de prijzen
          </Link>
        </div>

        {/* Slotzin: de pagina als eigen bewijs */}
        <div className="mt-14 text-sm text-[color:var(--text-muted)]">
          <p>
            Deze pagina is ingesproken met Dicteren.ai en geüpgraded door
            Claude.
          </p>
          <p className="mt-1 inline-flex items-center justify-center gap-x-1.5">
            Gemaakt met liefde in Nederland.
            <svg
              aria-label="Nederlandse vlag"
              viewBox="0 0 18 12"
              className="inline-block h-[11px] w-[16px] rounded-[2px] align-[-1px]"
            >
              <rect width="18" height="4" y="0" fill="#AE1C28" />
              <rect width="18" height="4" y="4" fill="#FFFFFF" />
              <rect width="18" height="4" y="8" fill="#21468B" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}
