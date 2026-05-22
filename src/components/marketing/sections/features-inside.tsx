"use client";

import { SettingRow, SettingsGroup } from "@/components/app/settings-group";
import { ToggleSwitch } from "@/components/app/toggle-switch";

export function FeaturesInsideSection() {
  return (
    <section
      className="px-4 py-16 sm:px-6 sm:py-20 lg:px-14"
      id="wat-zit-erin"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="chip">Wat zit erin</span>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Geen marketing-checklist.{" "}
            <span style={{ color: "var(--orange)" }}>
              Dit is letterlijk het instellingen-menu
            </span>{" "}
            van de app.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[color:var(--text-muted)] sm:text-lg">
            Onderstaande componenten — toggles, rijen, sneltoetsen — zijn
            exact dezelfde als in de app. Klik gerust op de schakelaars.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <SettingsGroup title="Sneltoets">
              <SettingRow
                title="Activeer dicteren"
                description="Druk de toets in en houd vast, of toggle aan/uit."
              >
                <span className="flex items-center gap-1">
                  <span className="brand-kbd">⌥</span>
                  <span className="brand-kbd">Space</span>
                </span>
              </SettingRow>
              <SettingRow
                title="Push-to-talk"
                description="Houd toets ingedrukt en spreek. Of toggle-modus voor langere stukken."
              >
                <ToggleSwitch defaultChecked label="Push-to-talk" />
              </SettingRow>
              <SettingRow
                title="Annuleer-toets"
                description="Een tweede sneltoets om een opname meteen weg te gooien."
              >
                <span className="brand-kbd">Esc</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="Audio">
              <SettingRow
                title="Microfoon-selectie"
                description="Kies welke microfoon je gebruikt — werkt ook met laptop dichtgeklapt."
              >
                <span className="brand-kbd">Auto</span>
              </SettingRow>
              <SettingRow
                title="Geluid bij start en stop"
                description="Marimba, Pop of een eigen geluid. Volume aanpasbaar."
              >
                <ToggleSwitch defaultChecked label="Geluiden" />
              </SettingRow>
              <SettingRow
                title="Mute andere apps tijdens dicteren"
                description="Stilt YouTube of Spotify automatisch zolang je aan het opnemen bent."
              >
                <ToggleSwitch label="Mute tijdens dicteren" />
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="Tekst">
              <SettingRow
                title="Eigen woorden"
                description="Voeg namen of jargon toe die anders verkeerd worden verstaan."
              >
                <span className="brand-kbd">+ Toevoegen</span>
              </SettingRow>
              <SettingRow
                title="Spatie toevoegen na plakken"
                description="Of meteen verder typen, zonder spatie."
              >
                <ToggleSwitch defaultChecked label="Spatie na plakken" />
              </SettingRow>
              <SettingRow
                title="Auto-verzenden"
                description="Drukt Enter of Cmd+Enter na het plakken — handig in chats."
              >
                <span className="brand-kbd">Uit</span>
              </SettingRow>
            </SettingsGroup>
          </div>

          <div className="flex flex-col gap-6">
            <SettingsGroup title="Geschiedenis & privacy">
              <SettingRow
                title="Geschiedenis bewaren"
                description="Laatste opnames lokaal op je computer, nooit op onze servers."
              >
                <ToggleSwitch defaultChecked label="Geschiedenis bewaren" />
              </SettingRow>
              <SettingRow
                title="Automatisch verwijderen"
                description="Na 3 dagen, 2 weken of 3 maanden — jij kiest."
              >
                <span className="brand-kbd">2 weken</span>
              </SettingRow>
              <SettingRow
                title="Geschiedenis-limiet"
                description="Hoeveel opnames maximaal — daarna rolt het automatisch door."
              >
                <span className="brand-kbd">50</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="App-gedrag">
              <SettingRow
                title="Verberg bij start"
                description="Start in de tray, geen venster — handig als je hem altijd aan hebt."
              >
                <ToggleSwitch label="Verberg bij start" />
              </SettingRow>
              <SettingRow
                title="Autostart bij inloggen"
                description="Dicteren.ai start automatisch wanneer je je computer aanzet."
              >
                <ToggleSwitch defaultChecked label="Autostart" />
              </SettingRow>
              <SettingRow
                title="Plakmethode"
                description="Cmd+V, Ctrl+Shift+V, direct typen of geen — voor speciale apps."
              >
                <span className="brand-kbd">Cmd+V</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title="Model">
              <SettingRow
                title="Lokaal Nederlands model"
                description="Dicteren.ai V3 (456 MB). Eenmalig downloaden, daarna offline."
              >
                <span className="brand-kbd">V3</span>
              </SettingRow>
              <SettingRow
                title="Ontlaad model na inactiviteit"
                description="Geheugen vrij na X minuten zonder dicteren."
              >
                <ToggleSwitch defaultChecked label="Ontlaad na inactiviteit" />
              </SettingRow>
            </SettingsGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
