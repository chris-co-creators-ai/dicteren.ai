import { Button } from "web";
import { Download, Plus, ArrowRight } from "lucide-react";

const row: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
};

export function Variants() {
  return (
    <div style={row}>
      <Button>Download voor Mac</Button>
      <Button variant="secondary">Bekijk prijzen</Button>
      <Button variant="outline">Meer info</Button>
      <Button variant="ghost">Annuleren</Button>
      <Button variant="destructive">Verwijderen</Button>
      <Button variant="link">Lees de voorwaarden</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <Button size="xs">Extra klein</Button>
      <Button size="sm">Klein</Button>
      <Button size="default">Standaard</Button>
      <Button size="lg">Groot</Button>
    </div>
  );
}

export function WithIcon() {
  return (
    <div style={row}>
      <Button>
        <Download /> Download voor Mac
      </Button>
      <Button variant="secondary">
        <Plus /> Nieuwe licentie
      </Button>
      <Button variant="outline">
        Volgende <ArrowRight />
      </Button>
    </div>
  );
}

export function IconOnly() {
  return (
    <div style={row}>
      <Button size="icon" aria-label="Toevoegen">
        <Plus />
      </Button>
      <Button size="icon-sm" variant="secondary" aria-label="Download">
        <Download />
      </Button>
      <Button size="icon-lg" variant="outline" aria-label="Volgende">
        <ArrowRight />
      </Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={row}>
      <Button disabled>Bezig met opslaan…</Button>
      <Button variant="outline" disabled>
        Niet beschikbaar
      </Button>
    </div>
  );
}
