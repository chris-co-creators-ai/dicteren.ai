import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "web";
import { Mic, History, CreditCard, Settings, LifeBuoy } from "lucide-react";

export function Default() {
  return (
    <div style={{ padding: 16, width: 360 }}>
      <Command
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <CommandInput placeholder="Typ een opdracht of zoek..." />
        <CommandList>
          <CommandEmpty>Niets gevonden.</CommandEmpty>
          <CommandGroup heading="Acties">
            <CommandItem>
              <Mic /> Nieuwe opname starten
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <History /> Geschiedenis openen
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem>
              <CreditCard /> Abonnement beheren
            </CommandItem>
            <CommandItem>
              <Settings /> Instellingen
            </CommandItem>
            <CommandItem>
              <LifeBuoy /> Hulp
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
