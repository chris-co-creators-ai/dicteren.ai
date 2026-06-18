import { Toggle } from "web";
import { Bold, Italic, Mic } from "lucide-react";

export function Default() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 360 }}>
      <Toggle aria-label="Vetgedrukt">
        <Bold />
        Vet
      </Toggle>
      <Toggle pressed aria-label="Vetgedrukt aan">
        <Bold />
        Vet
      </Toggle>
      <Toggle disabled aria-label="Vetgedrukt uitgeschakeld">
        <Bold />
        Vet
      </Toggle>
    </div>
  );
}

export function Outline() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 360 }}>
      <Toggle variant="outline" aria-label="Cursief">
        <Italic />
        Cursief
      </Toggle>
      <Toggle variant="outline" pressed aria-label="Cursief aan">
        <Italic />
        Cursief
      </Toggle>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 360 }}>
      <Toggle size="sm" aria-label="Microfoon klein">
        <Mic />
      </Toggle>
      <Toggle size="default" pressed aria-label="Microfoon aan">
        <Mic />
      </Toggle>
      <Toggle size="lg" aria-label="Microfoon groot">
        <Mic />
      </Toggle>
    </div>
  );
}
