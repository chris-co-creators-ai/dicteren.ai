import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  Button,
} from "web";
import { KeyRound, Building2, CreditCard, Mic } from "lucide-react";

export function Basic() {
  return (
    <Item variant="outline" style={{ maxWidth: 420 }}>
      <ItemMedia variant="icon">
        <KeyRound />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Jaarabonnement</ItemTitle>
        <ItemDescription>
          Eén licentie, het hele jaar dicteren op je Mac.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline" size="sm">
          Beheren
        </Button>
      </ItemActions>
    </Item>
  );
}

export function Groep() {
  return (
    <ItemGroup style={{ maxWidth: 420 }}>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Mic />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Licentie DICT-2026-AB12</ItemTitle>
          <ItemDescription>Actief tot 14 juni 2027.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            Kopiëren
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Building2 />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Team Acme</ItemTitle>
          <ItemDescription>3 van de 5 plekken in gebruik.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            Toewijzen
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemMedia variant="icon">
          <CreditCard />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Volgende incasso</ItemTitle>
          <ItemDescription>96 euro op 14 juni 2027 via SEPA.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            Bekijken
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  );
}
