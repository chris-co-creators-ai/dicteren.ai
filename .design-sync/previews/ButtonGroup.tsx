import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  Button,
} from "web";
import { Bold, Italic, Underline, Copy } from "lucide-react";

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  alignItems: "flex-start",
};

export function Basic() {
  return (
    <ButtonGroup>
      <Button variant="outline">Maand</Button>
      <Button variant="outline">Kwartaal</Button>
      <Button variant="outline">Jaar</Button>
    </ButtonGroup>
  );
}

export function WithIcons() {
  return (
    <ButtonGroup>
      <Button variant="outline" size="icon" aria-label="Vet">
        <Bold />
      </Button>
      <Button variant="outline" size="icon" aria-label="Cursief">
        <Italic />
      </Button>
      <Button variant="outline" size="icon" aria-label="Onderstreept">
        <Underline />
      </Button>
    </ButtonGroup>
  );
}

export function WithTextAndSeparator() {
  return (
    <div style={wrap}>
      <ButtonGroup>
        <ButtonGroupText>DICT-2026-AB12-CD34</ButtonGroupText>
        <ButtonGroupSeparator />
        <Button variant="outline">
          <Copy /> Kopieer code
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <ButtonGroupText>Aantal plekken</ButtonGroupText>
        <Button variant="outline">5</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">10</Button>
        <Button variant="outline">25</Button>
      </ButtonGroup>
    </div>
  );
}

export function Vertical() {
  return (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Licentie beheren</Button>
      <Button variant="outline">Factuur downloaden</Button>
      <Button variant="outline">Abonnement opzeggen</Button>
    </ButtonGroup>
  );
}
