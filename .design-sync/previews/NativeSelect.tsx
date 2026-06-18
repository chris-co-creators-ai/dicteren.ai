import { NativeSelect, NativeSelectOption, NativeSelectOptGroup } from "web";

export function Default() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Abonnementsperiode</span>
      <NativeSelect defaultValue="jaar">
        <NativeSelectOption value="maand">Maand</NativeSelectOption>
        <NativeSelectOption value="kwartaal">Kwartaal</NativeSelectOption>
        <NativeSelectOption value="jaar">Jaar</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}

export function Small() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Klein formaat</span>
      <NativeSelect size="sm" defaultValue="onder">
        <NativeSelectOption value="geen">Geen</NativeSelectOption>
        <NativeSelectOption value="onder">Onder</NativeSelectOption>
        <NativeSelectOption value="boven">Boven</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}

export function OptionGroups() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Sneltoets per actie</span>
      <NativeSelect defaultValue="optie-spatie">
        <NativeSelectOptGroup label="Dicteren">
          <NativeSelectOption value="optie-spatie">Option + spatie</NativeSelectOption>
          <NativeSelectOption value="ctrl-spatie">Ctrl + spatie</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="Nabewerking">
          <NativeSelectOption value="optie-n">Option + N</NativeSelectOption>
          <NativeSelectOption value="optie-shift-n">Option + Shift + N</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Uitgeschakeld</span>
      <NativeSelect defaultValue="jaar" disabled>
        <NativeSelectOption value="maand">Maand</NativeSelectOption>
        <NativeSelectOption value="kwartaal">Kwartaal</NativeSelectOption>
        <NativeSelectOption value="jaar">Jaar</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
