import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  Button,
} from "web";

export function Instellingen() {
  return (
    <div style={{ padding: 16, minHeight: 360 }}>
      <Sheet defaultOpen>
        <SheetTrigger render={<Button variant="outline">Instellingen</Button>} />
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Sneltoetsen</SheetTitle>
            <SheetDescription>
              Stel in met welke toetsen je dicteert en annuleert.
            </SheetDescription>
          </SheetHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Dicteer-sneltoets</label>
              <input
                defaultValue="option + spatie"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Annuleer-sneltoets</label>
              <input
                defaultValue="esc"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 14,
                }}
              />
            </div>
          </div>
          <SheetFooter>
            <Button>Opslaan</Button>
            <SheetClose render={<Button variant="outline">Sluiten</Button>} />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
