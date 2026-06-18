import { Alert, AlertTitle, AlertDescription } from "web";
import { CircleCheck, TriangleAlert } from "lucide-react";

export function Default() {
  return (
    <Alert style={{ maxWidth: 440 }}>
      <CircleCheck />
      <AlertTitle>Licentie geactiveerd</AlertTitle>
      <AlertDescription>
        Je code staat in de mail van info@dicteren.ai. Je kunt direct beginnen.
      </AlertDescription>
    </Alert>
  );
}

export function Destructive() {
  return (
    <Alert variant="destructive" style={{ maxWidth: 440 }}>
      <TriangleAlert />
      <AlertTitle>Betaling mislukt</AlertTitle>
      <AlertDescription>
        We konden je laatste betaling niet verwerken. Werk je betaalgegevens bij
        om door te gaan.
      </AlertDescription>
    </Alert>
  );
}

export function TitleOnly() {
  return (
    <Alert style={{ maxWidth: 440 }}>
      <AlertTitle>Je proefperiode loopt over 3 dagen af.</AlertTitle>
    </Alert>
  );
}
