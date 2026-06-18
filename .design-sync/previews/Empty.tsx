import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  Button,
} from "web";
import { KeyRound } from "lucide-react";

export function Basic() {
  return (
    <Empty style={{ maxWidth: 420, border: "1px dashed var(--border)" }}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRound />
        </EmptyMedia>
        <EmptyTitle>Nog geen licenties</EmptyTitle>
        <EmptyDescription>
          Zodra je een abonnement afsluit, verschijnt je licentiecode hier.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Probeer 14 dagen gratis</Button>
      </EmptyContent>
    </Empty>
  );
}
