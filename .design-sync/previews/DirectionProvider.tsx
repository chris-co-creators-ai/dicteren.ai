import { DirectionProvider, Button } from "web";

export function Ltr() {
  return (
    <DirectionProvider direction="ltr">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 14 }}>Leesrichting links-naar-rechts:</span>
        <Button size="sm">Download voor Mac</Button>
        <Button size="sm" variant="outline">
          Bekijk de prijzen
        </Button>
      </div>
    </DirectionProvider>
  );
}
