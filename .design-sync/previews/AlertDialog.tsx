import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
  Button,
} from "web";
import { TriangleAlert } from "lucide-react";

export function WeetJeHetZeker() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <AlertDialog defaultOpen>
        <AlertDialogTrigger render={<Button variant="destructive">Licentie intrekken</Button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Je trekt deze licentie in. Het teamlid verliest direct toegang tot
              Dicteren.ai. Dit maakt de seat weer vrij voor iemand anders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Intrekken</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MetIcoon() {
  return (
    <div style={{ padding: 16, minHeight: 340 }}>
      <AlertDialog defaultOpen>
        <AlertDialogTrigger render={<Button variant="outline">Account verwijderen</Button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Account verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              We verwijderen je account en je facturatiegegevens. Lopende
              abonnementen stoppen aan het einde van de periode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Behouden</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
