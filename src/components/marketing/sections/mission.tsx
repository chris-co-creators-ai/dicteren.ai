import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Onze missie — bewuste register-wissel: deze sectie spreekt de taal van het
// sociale domein (digitale inclusie, meedoen, zelfredzaamheid). Zie TOV.

export function MissionSection() {
  return (
    <section
      className="px-6 py-20 lg:px-14 lg:py-24"
      style={{ background: "var(--bg-deep)" }}
      id="onze-missie"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        {/* Links: de scene-afbeelding */}
        <div className="overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-lg)" }}>
          <Image
            src="/branding/landingpage-right-woman-mascot-document-v2-20260608.png"
            alt="Vrouw dicteert een bericht aan Anna, de tekst verschijnt direct op haar scherm"
            width={1693}
            height={929}
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="block h-auto w-full"
          />
        </div>

        {/* Rechts: de missie */}
        <div>
          <span className="chip chip-orange">Onze missie</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[color:var(--navy)] lg:text-4xl">
            Iedereen verdient een stem.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)] lg:text-lg">
            Met het team van Dicteren.ai zetten we ons in voor een samenleving
            waarin iedereen mee kan doen. Ook digitaal. Daar maken we onder
            werktijd ruimte voor, want maatschappelijke impact hoort wat ons
            betreft gewoon bij ondernemen.
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[color:var(--text-muted)]">
            Ieder van ons kent iemand voor wie een computer gebruiken niet
            vanzelfsprekend is, door een lichamelijke beperking. Daarom komen
            we graag in contact met organisaties die zich voor deze doelgroep
            inzetten. Samen kijken we, geheel vrijblijvend, waar spraak
            drempels wegneemt en zelfredzaamheid vergroot. Dicteren.ai stellen
            we daarvoor kosteloos beschikbaar.
          </p>
          <p className="mt-4 text-base font-semibold text-[color:var(--navy)]">
            {`Ben jij zo'n organisatie, of ken je er een?`}
          </p>
          <div className="mt-5">
            <Link href="/word-partner" className="btn btn-primary">
              Meld een organisatie aan
              <ArrowRight className="size-4" strokeWidth={2.2} />
            </Link>
          </div>
          <p className="mt-4 text-sm text-[color:var(--text-soft)]">
            Namens het hele team: alvast hartelijk dank.
          </p>
        </div>
      </div>
    </section>
  );
}
