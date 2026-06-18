import { Spinner } from "web";

export function Solo() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 16 }}>
      <Spinner />
    </div>
  );
}

export function MetLabel() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 16 }}>
      <Spinner />
      <span style={{ fontSize: 14 }}>Bezig met laden…</span>
    </div>
  );
}

export function Maten() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16 }}>
      <Spinner style={{ width: 16, height: 16 }} />
      <Spinner style={{ width: 24, height: 24 }} />
      <Spinner style={{ width: 32, height: 32 }} />
    </div>
  );
}
