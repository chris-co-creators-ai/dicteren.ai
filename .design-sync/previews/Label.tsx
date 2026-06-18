import { Label, Input, Checkbox } from "web";

export function WithInput() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <Label htmlFor="license-code">Licentiecode</Label>
      <Input id="license-code" placeholder="DIC-2026-XXXX-XXXX" />
    </div>
  );
}

export function WithCheckbox() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <Label htmlFor="terms-accept">
        <Checkbox id="terms-accept" defaultChecked />
        Ik ga akkoord met de voorwaarden
      </Label>
    </div>
  );
}
