# src/app/(marketing)/ — publieke site

## Purpose

De publieke marketing- en informatiepagina's: homepage, prijzen, product, voor-wie, zakelijk, blog, kennisbank, privacy, voorwaarden, over-ons, FAQ, contact, ai-model, wispr-flow-alternatief, word-partner.

## Ownership

- Alle copy hier is externe communicatie. Daarmee bindend aan de factcheck- en TOV-contracten.

## Local Contracts

- **Elke feitelijke claim toetsen aan `.claude/skills/dicteren-app-truth.md`.** Staat de claim daar niet met bron: niet schrijven. Drift = eerst de skill bijwerken, dan de copy.
- **TOV is leidend** (`.claude/docs/tone-of-voice.md`): B1 NL, zinnen onder 17 woorden, actief, geen em-dashes, geen rule-of-three, geen AI-vocab. Humanizer-skill vooraf laden.
- **Cijfer-claims** alleen met peer-reviewed bron uit `.claude/docs/wetenschap/` (status "geverifieerd") + instituut + jaartal in de tekst.
- **Concurrent-claims** (Wispr Flow e.d.) alleen uit `.claude/docs/copy/concurrent-claims-*.md`: citaat + URL + datum. Hercheck per kwartaal.
- **Model-naamgeving:** marketing zegt "Dicteren.ai V3" / "ons model". NVIDIA/Parakeet/CC-BY alleen op `/ai-model` en in legal-docs.
- **Opname-element** heet "het opname-balkje", nooit "overlay/pop-up/mini-bar".
- **Geen HTML-entities** in JSX (`&apos;`/`&rsquo;`/`&#39;`): herschrijf de zin of gebruik een template-string.

## Verification

- Pre-flight checklist uit de TOV (sectie 15) vóór een pagina live gaat.
