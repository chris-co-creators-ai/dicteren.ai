import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "web";
import { Search } from "lucide-react";

export function WithIcon() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Zoeken in geschiedenis</span>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Zoek in je transcripties" />
      </InputGroup>
    </div>
  );
}

export function WithButton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Knop rechts</span>
      <InputGroup>
        <InputGroupInput placeholder="Voer je licentiecode in" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="default" size="sm">
            Activeer
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function WithText() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Vaste tekst rechts</span>
      <InputGroup>
        <InputGroupInput placeholder="Aantal" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>seats</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function WithTextarea() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Tekstvak met label boven</span>
      <InputGroup>
        <InputGroupAddon align="block-start">
          <InputGroupText>Eigen woorden</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="Voeg woorden toe die het model vaak verkeerd hoort" />
      </InputGroup>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Uitgeschakeld</span>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Zoek in je transcripties" disabled />
      </InputGroup>
    </div>
  );
}
