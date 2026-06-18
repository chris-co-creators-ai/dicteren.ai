import { Skeleton } from "web";

export function Regels() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}>
      <Skeleton style={{ height: 12, width: "90%" }} />
      <Skeleton style={{ height: 12, width: "75%" }} />
      <Skeleton style={{ height: 12, width: "60%" }} />
    </div>
  );
}

export function Avatar() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Skeleton style={{ height: 40, width: 40, borderRadius: "9999px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton style={{ height: 12, width: 120 }} />
        <Skeleton style={{ height: 12, width: 80 }} />
      </div>
    </div>
  );
}

export function Kaart() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
      <Skeleton style={{ height: 120, width: "100%", borderRadius: 12 }} />
      <Skeleton style={{ height: 14, width: "70%" }} />
      <Skeleton style={{ height: 12, width: "100%" }} />
      <Skeleton style={{ height: 12, width: "85%" }} />
    </div>
  );
}
