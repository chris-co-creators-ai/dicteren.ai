import { Kbd, KbdGroup } from "web";

export function Sneltoets() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 16 }}>
      <span style={{ fontSize: 14 }}>Dicteer-sneltoets:</span>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>spatie</Kbd>
      </KbdGroup>
    </div>
  );
}

export function LosseKeys() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 16 }}>
      <Kbd>⌘</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>esc</Kbd>
      <Kbd>spatie</Kbd>
    </div>
  );
}

export function Combinatie() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 16 }}>
      <span style={{ fontSize: 14 }}>Annuleer opname:</span>
      <KbdGroup>
        <Kbd>⌥</Kbd>
        <Kbd>esc</Kbd>
      </KbdGroup>
    </div>
  );
}
