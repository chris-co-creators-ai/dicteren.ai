import { RadioGroup, RadioGroupItem, Label } from "web";

export function Default() {
  return (
    <RadioGroup defaultValue="jaar" style={{ maxWidth: 320 }}>
      <Label htmlFor="periode-maand">
        <RadioGroupItem id="periode-maand" value="maand" />
        Maand
      </Label>
      <Label htmlFor="periode-kwartaal">
        <RadioGroupItem id="periode-kwartaal" value="kwartaal" />
        Kwartaal
      </Label>
      <Label htmlFor="periode-jaar">
        <RadioGroupItem id="periode-jaar" value="jaar" />
        Jaar
      </Label>
    </RadioGroup>
  );
}
