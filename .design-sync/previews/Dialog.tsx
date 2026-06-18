import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
} from "web";

export function Bevestiging() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <Dialog defaultOpen>
        <DialogTrigger render={<Button variant="outline">Abonnement opzeggen</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnement opzeggen?</DialogTitle>
            <DialogDescription>
              Je houdt toegang tot het einde van de huidige periode. Daarna stopt
              de dictee-functie en verloopt je licentie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Toch behouden</Button>} />
            <Button variant="destructive">Opzeggen bevestigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Formulier() {
  return (
    <div style={{ padding: 16, minHeight: 340 }}>
      <Dialog defaultOpen>
        <DialogTrigger render={<Button>Licentie toewijzen</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Licentie toewijzen</DialogTitle>
            <DialogDescription>
              Koppel een seat aan een teamlid. Diegene krijgt de licentiecode per
              mail van info@dicteren.ai.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>E-mailadres</label>
            <input
              defaultValue="sanne@kvd-advocaten.nl"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 14,
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Annuleren</Button>} />
            <Button>Toewijzen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
