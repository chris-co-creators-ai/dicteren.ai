#!/usr/bin/env bash
# Regenereert de converter-inputs voor /design-sync:
#   1. de barrel-entry (.cache/ds-entry.tsx) — re-exporteert alle ui-componenten
#   2. de Tailwind-CSS (.cache/dicteren-ds.css) — utilities + brand-tokens
# Beide leven onder .design-sync/.cache/ (gitignored), dus elke re-sync moet dit
# eerst draaien. cfg.buildCmd wijst hierheen, dus resync.mjs roept het aan.
# Draai vanuit web/ (of waar dan ook — het script cd't zelf).
set -euo pipefail
cd "$(dirname "$0")/.."            # -> web/
mkdir -p .design-sync/.cache

# 1. Barrel: elke src/components/ui/*.tsx naar window.DicterenDS
{
  echo "// AUTO-GENERATED door .design-sync/build-inputs.sh — niet handmatig bewerken."
  for f in src/components/ui/*.tsx; do
    echo "export * from \"@/components/ui/$(basename "$f" .tsx)\";"
  done
} > .design-sync/.cache/ds-entry.tsx

# 2. Tailwind v4 statisch compileren (CLI staat in de .ds-sync scratch)
TW=".ds-sync/node_modules/.bin/tailwindcss"
if [ ! -x "$TW" ]; then
  ( cd .ds-sync && npm i @tailwindcss/cli >/dev/null 2>&1 )
fi
"$TW" -i .design-sync/ds-input.css -o .design-sync/.cache/dicteren-ds.css

echo "build-inputs klaar: $(grep -c '^export' .design-sync/.cache/ds-entry.tsx) componenten in de barrel + dicteren-ds.css"
