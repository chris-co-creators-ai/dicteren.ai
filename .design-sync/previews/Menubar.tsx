import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
} from "web";

export function Default() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <Menubar>
        <MenubarMenu defaultOpen>
          <MenubarTrigger>Bestand</MenubarTrigger>
          <MenubarContent style={{ width: 220 }}>
            <MenubarItem>
              Nieuwe opname
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Transcriptie exporteren
              <MenubarShortcut>⌘E</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Geschiedenis openen</MenubarItem>
            <MenubarSeparator />
            <MenubarCheckboxItem checked>
              Automatisch opslaan
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Bewerken</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Instellingen</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}
