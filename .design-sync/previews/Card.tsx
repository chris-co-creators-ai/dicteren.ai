import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  Button,
} from "web";

export function Basic() {
  return (
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Jaarabonnement</CardTitle>
        <CardDescription>
          Eén licentie, het hele jaar dicteren op je Mac.
        </CardDescription>
      </CardHeader>
      <CardContent>
        Praat je tekst in plaats van typen. Je stem blijft op je eigen computer.
      </CardContent>
      <CardFooter>
        <Button>Probeer 14 dagen gratis</Button>
      </CardFooter>
    </Card>
  );
}

export function WithAction() {
  return (
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Licentie DICT-2026-AB12</CardTitle>
        <CardDescription>Actief tot 14 juni 2027</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Beheren
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        Toegewezen aan team Acme. Drie van de vijf plekken in gebruik.
      </CardContent>
    </Card>
  );
}

export function Small() {
  return (
    <Card size="sm" style={{ maxWidth: 280 }}>
      <CardHeader>
        <CardTitle>Compacte kaart</CardTitle>
        <CardDescription>De sm-variant, strakker spacing.</CardDescription>
      </CardHeader>
      <CardContent>Voor lijsten en dashboards.</CardContent>
    </Card>
  );
}
