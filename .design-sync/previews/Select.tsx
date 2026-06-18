import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "web";

export function Default() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <Select defaultValue="kwartaal" defaultOpen>
        <SelectTrigger style={{ width: 220 }}>
          <SelectValue placeholder="Kies een periode" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Abonnementsperiode</SelectLabel>
            <SelectItem value="maand">Maand</SelectItem>
            <SelectItem value="kwartaal">Kwartaal</SelectItem>
            <SelectItem value="jaar">Jaar</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function Gesloten() {
  return (
    <div style={{ padding: 16 }}>
      <Select defaultValue="jaar">
        <SelectTrigger style={{ width: 220 }}>
          <SelectValue placeholder="Kies een periode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="maand">Maand</SelectItem>
          <SelectItem value="kwartaal">Kwartaal</SelectItem>
          <SelectItem value="jaar">Jaar</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
