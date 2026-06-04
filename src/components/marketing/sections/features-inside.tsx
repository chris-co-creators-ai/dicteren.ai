"use client";

import Link from "next/link";
import { SettingRow, SettingsGroup } from "@/components/app/settings-group";
import { ToggleSwitch } from "@/components/app/toggle-switch";

// Dialoog-patroon: elke kop is de volgende gedachte van de lezer.
// De toggles eronder zijn echte app-componenten met de ECHTE defaults
// (push-to-talk aan, autostart uit) — factcheck: .claude/skills/dicteren-app-truth.md

const DIALOGUE: { q: string; a: string }[] = [
  {
    q: "Waar moet ik beginnen met schrijven?",
    a: "Dat gevoel kennen we zelf ook. Je wil zoveel vertellen, maar het komt niet uit je vingers. Spreek het uit. Je AI gaat ermee aan de slag alsof je het had uitgetypt. Alleen nu met alles erin.",
  },
  {
    q: "Wij kunnen zelf niet meer zonder.",
    a: "Ja, je leest het goed. Op ons kantoor gebruikt iedereen Dicteren.ai. Je hoort elkaars gesprekken met AI gewoon hardop. Daar leer je nog van ook.",
  },
  {
    q: "Mijn vak zit vol jargon.",
    a: "Cliëntnamen, medicijnen, vaktermen. Voeg ze één keer toe als eigen woorden, daarna verstaat Dicteren.ai ze gewoon.",
  },
  {
    q: "En wat ik inspreek?",
    a: "Blijft van jou. De geschiedenis staat op jouw computer en loopt vanzelf leeg als jij dat wil.",
  },
  {
    q: "Overtuig me maar.",
    a: "Hoeft niet. Test het zelf, 14 dagen gratis. Geen creditcard. Stopt vanzelf.",
  },
];

export function FeaturesInsideSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14" id="wat-zit-erin">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip">Voor wie veel schrijft</span>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Werkt zoals <span style={{ color: "var(--orange)" }}>jij</span>{" "}
            werkt.
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* Links: het gesprek */}
          <div className="flex flex-col gap-7">
            {DIALOGUE.map((item) => (
              <div key={item.q}>
                <h3 className="text-lg font-bold leading-snug text-[color:var(--navy)]">
                  {`"${item.q}"`}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--text-muted)]">
                  {item.a}
                </p>
              </div>
            ))}
            {/* De actie op het moment van ja */}
            <div>
              <Link
                href="/auth/sign-up?next=/trial/start"
                className="btn btn-primary"
              >
                Probeer 14 dagen gratis
              </Link>
            </div>
          </div>

          {/* Rechts: echte app-componenten als bewijs */}
          <div className="flex flex-col gap-6">
            <p className="text-sm font-semibold text-[color:var(--text-soft)]">
              De schakelaars hieronder komen uit de echte app. Klik gerust.
            </p>
            <SettingsGroup title="Sneltoets">
              <SettingRow
                title="Push-to-talk"
                description="Houd de toets ingedrukt en spreek. Loslaten is klaar."
              >
                <ToggleSwitch defaultChecked label="Push-to-talk" />
              </SettingRow>
              <SettingRow
                title="Annuleer-toets"
                description="Een opname meteen weggooien."
              >
                <span className="brand-kbd">Esc</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="Tekst">
              <SettingRow
                title="Eigen woorden"
                description="Namen en jargon die anders verkeerd worden verstaan."
              >
                <span className="brand-kbd">+ Toevoegen</span>
              </SettingRow>
              <SettingRow
                title="Auto-verzenden"
                description="Drukt Enter na het plakken. Handig in chats."
              >
                <span className="brand-kbd">Uit</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="Geschiedenis & privacy">
              <SettingRow
                title="Geschiedenis bewaren"
                description="Lokaal op je computer, nooit op onze servers."
              >
                <ToggleSwitch defaultChecked label="Geschiedenis bewaren" />
              </SettingRow>
              <SettingRow
                title="Automatisch verwijderen"
                description="Na 3 dagen, 2 weken of 3 maanden. Jij kiest."
              >
                <span className="brand-kbd">Kies zelf</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="Model">
              <SettingRow
                title="Lokaal Nederlands model"
                description="Dicteren.ai V3. Eenmalig downloaden, daarna offline."
              >
                <span className="brand-kbd">V3</span>
              </SettingRow>
            </SettingsGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
