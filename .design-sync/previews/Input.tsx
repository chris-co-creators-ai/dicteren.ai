import { Input, Label } from "web";

export function Placeholder() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <Label htmlFor="email-default">E-mailadres</Label>
      <Input id="email-default" type="email" placeholder="jij@bedrijf.nl" />
    </div>
  );
}

export function WithValue() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <Label htmlFor="email-value">E-mailadres</Label>
      <Input id="email-value" type="email" defaultValue="sanne@advocatenkvd.nl" />
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <Label htmlFor="email-disabled">E-mailadres</Label>
      <Input id="email-disabled" type="email" defaultValue="sanne@advocatenkvd.nl" disabled />
    </div>
  );
}

export function Invalid() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <Label htmlFor="email-error">E-mailadres</Label>
      <Input id="email-error" type="email" defaultValue="sanne@bedrijf" aria-invalid />
    </div>
  );
}
