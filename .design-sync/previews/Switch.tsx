import { Switch, Label } from "web";

export function On() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
      <Label htmlFor="post-processing">
        <Switch id="post-processing" defaultChecked />
        AI-nabewerking
      </Label>
    </div>
  );
}

export function Off() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
      <Label htmlFor="sound-signals">
        <Switch id="sound-signals" />
        Geluidssignalen
      </Label>
    </div>
  );
}
