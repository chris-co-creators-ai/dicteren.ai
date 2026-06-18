import { Badge } from "web";
import { Check } from "lucide-react";

export function Varianten() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Badge variant="default">Actief</Badge>
      <Badge variant="secondary">Proefperiode</Badge>
      <Badge variant="destructive">Verlopen</Badge>
      <Badge variant="outline">Geannuleerd</Badge>
      <Badge variant="ghost">Concept</Badge>
      <Badge variant="link">Bekijk licentie</Badge>
    </div>
  );
}

export function MetIcoon() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Badge variant="default">
        <Check />
        Betaling gelukt
      </Badge>
      <Badge variant="secondary">14 dagen gratis</Badge>
    </div>
  );
}
