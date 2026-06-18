import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  Button,
} from "web";

export function Detail() {
  return (
    <div style={{ padding: 16, minHeight: 420 }}>
      <Drawer defaultOpen>
        <DrawerTrigger render={<Button variant="outline">Licentie bekijken</Button>} />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Licentie DIC-2026-AB12-CD34</DrawerTitle>
            <DrawerDescription>
              Jaarabonnement, actief tot 11 juni 2027.
            </DrawerDescription>
          </DrawerHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Status</span>
              <span>Actief</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Toegewezen aan</span>
              <span>sanne@kvd-advocaten.nl</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Periode</span>
              <span>Jaar</span>
            </div>
          </div>
          <DrawerFooter>
            <Button>Code opnieuw versturen</Button>
            <DrawerClose render={<Button variant="outline">Sluiten</Button>} />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
