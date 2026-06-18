import { ToggleGroup, ToggleGroupItem } from "web";
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from "lucide-react";

export function Single() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Uitlijning (één keuze)</span>
      <ToggleGroup type="single" defaultValue="links">
        <ToggleGroupItem value="links" aria-label="Links uitlijnen">
          <AlignLeft />
        </ToggleGroupItem>
        <ToggleGroupItem value="midden" aria-label="Midden uitlijnen">
          <AlignCenter />
        </ToggleGroupItem>
        <ToggleGroupItem value="rechts" aria-label="Rechts uitlijnen">
          <AlignRight />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function Multiple() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Opmaak (meerdere keuzes)</span>
      <ToggleGroup type="multiple" defaultValue={["vet", "onderstreept"]}>
        <ToggleGroupItem value="vet" aria-label="Vet">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="cursief" aria-label="Cursief">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="onderstreept" aria-label="Onderstreept">
          <Underline />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function Labels() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Periode (labels, outline)</span>
      <ToggleGroup type="single" variant="outline" defaultValue="jaar">
        <ToggleGroupItem value="maand">Maand</ToggleGroupItem>
        <ToggleGroupItem value="kwartaal">Kwartaal</ToggleGroupItem>
        <ToggleGroupItem value="jaar">Jaar</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
