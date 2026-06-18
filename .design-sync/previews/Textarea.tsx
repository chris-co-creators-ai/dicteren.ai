import { Textarea, Label } from "web";

export function Empty() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
      <Label htmlFor="words-empty">Eigen woorden</Label>
      <Textarea
        id="words-empty"
        placeholder="Voeg woorden toe die het model lastig herkent, één per regel."
      />
    </div>
  );
}

export function Filled() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
      <Label htmlFor="words-filled">Eigen woorden</Label>
      <Textarea
        id="words-filled"
        defaultValue={"dossiernummer\nverwerkersovereenkomst\nDicteren.ai\nproces-verbaal"}
      />
    </div>
  );
}
