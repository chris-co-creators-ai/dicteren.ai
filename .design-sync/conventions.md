## Dicteren.ai — bouwen met dit design system

shadcn/ui-componenten op @base-ui/react, gestyled met Tailwind v4 en de
Dicteren.ai-brandtokens. Lichte modus (de `.dark`-variant is gereserveerd, niet
gebruiken). Importeer elke component (en zijn sub-delen) uit de bundle-global.

### Setup en wrapping

De meeste componenten hebben geen provider nodig — de brandtokens staan als
CSS-variabelen op `:root` in `styles.css` en gelden zodra die stylesheet laadt.
Drie uitzonderingen, anders rendert het onvolledig:

- `Sidebar` → wrap in `SidebarProvider`.
- `Tooltip` → wrap in `TooltipProvider`.
- Grafieken → gebruik `ChartContainer` met een `config`; geef de wrapper een
  vaste pixel-hoogte (recharts meet zijn ouder).

base-ui-overlays (`Dialog`, `Popover`, `DropdownMenu`, `Select`, …) openen via
een `open`/`defaultOpen`-prop op de root; triggers nemen `render={<Button…/>}`
(geen `asChild`). Een groepslabel (`DropdownMenuLabel`) moet binnen een
`DropdownMenuGroup` staan.

### Styling-idioom — gebruik deze namen

De geleverde `styles.css` is een statische Tailwind-compile van wat de app
gebruikt. Style daarom met de onderstaande, gegarandeerd-aanwezige vocabulaire;
ga er niet vanuit dat een willekeurige Tailwind-utility erin zit.

**Semantische classes** (de brandkleuren zitten hierachter):
`bg-primary` + `text-primary-foreground` (navy), `bg-secondary` (zacht aqua),
`bg-muted` + `text-muted-foreground`, `bg-card` + `text-card-foreground`,
`bg-popover`, `bg-destructive` (rood), `border`, `ring-ring`.

**Oranje accent** is géén utility-class. Gebruik de kant-en-klare knop/chip
hieronder, of `style={{ background: "var(--orange)" }}`.

**Kant-en-klare component-classes** (altijd aanwezig, `@layer components`):
`.btn` met `.btn-primary` (oranje hoofd-CTA), `.btn-navy`, `.btn-secondary`,
`.btn-ghost`, `.btn-sm`, `.btn-lg`; `.chip` met `.chip-orange` `.chip-green`
`.chip-navy` `.chip-red`; `.brand-card` (witte kaart, zachte schaduw);
`.brand-kbd` (toets); `.wave` (stem-balkjes); `.dot-bg` (stippen-achtergrond).

**CSS-variabele tokens** (voor maatwerk via `style` of `var()`):
kleuren `--navy` `--navy-700` `--navy-500` `--navy-300`, `--aqua` `--aqua-200`
`--aqua-50`, `--orange` `--orange-600` `--orange-50`, `--green`, `--red`;
vlakken `--bg` `--bg-deep` `--surface` `--border-soft`; radii `--r-xs`…`--r-pill`
en `--radius`; schaduwen `--shadow-sm` `--shadow-md` `--shadow-lg` `--shadow-pop`;
fonts `--font-sans` (Nunito Sans) en `--font-mono` (JetBrains Mono).

### Waar de waarheid staat

Lees vóór het stylen `styles.css` (tokens + `@import`-closure) en per component
`<Naam>.prompt.md` (gebruik + voorbeelden) en `<Naam>.d.ts` (props). De
component-code is de bron, niet deze samenvatting.

### Idiomatisch voorbeeld

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "<bundle>";

function Pricing() {
  return (
    <Card className="bg-card text-card-foreground" style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Jaarabonnement</CardTitle>
        <CardDescription>Eén licentie, het hele jaar dicteren.</CardDescription>
      </CardHeader>
      <CardContent>
        <button className="btn btn-primary">Probeer 14 dagen gratis</button>
      </CardContent>
    </Card>
  );
}
```
