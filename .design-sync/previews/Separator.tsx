import { Separator } from "web";

export function Horizontaal() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
      <span style={{ fontSize: 14 }}>Abonnement maand</span>
      <Separator />
      <span style={{ fontSize: 14 }}>Abonnement jaar</span>
    </div>
  );
}

export function Verticaal() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", height: 24 }}>
      <span style={{ fontSize: 14 }}>Mac</span>
      <Separator orientation="vertical" />
      <span style={{ fontSize: 14 }}>Windows</span>
      <Separator orientation="vertical" />
      <span style={{ fontSize: 14 }}>Offline</span>
    </div>
  );
}
