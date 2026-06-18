import { Checkbox, Label } from "web";

export function States() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
      <Label htmlFor="updates-unchecked">
        <Checkbox id="updates-unchecked" />
        Stuur me productupdates
      </Label>

      <Label htmlFor="updates-checked">
        <Checkbox id="updates-checked" defaultChecked />
        Stuur me productupdates
      </Label>

      <Label htmlFor="updates-disabled">
        <Checkbox id="updates-disabled" defaultChecked disabled />
        Stuur me productupdates
      </Label>
    </div>
  );
}
