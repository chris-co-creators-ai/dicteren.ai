import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
  ContextMenuShortcut,
} from "web";
import { Copy, Pencil, Trash2, Download } from "lucide-react";

export function Default() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <ContextMenu defaultOpen>
        <ContextMenuTrigger
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 280,
            height: 96,
            border: "1px dashed var(--border)",
            borderRadius: 8,
            fontSize: 14,
            color: "var(--muted-foreground)",
          }}
        >
          Rechtsklik op een transcriptie
        </ContextMenuTrigger>
        <ContextMenuContent style={{ width: 220 }}>
          <ContextMenuGroup>
            <ContextMenuLabel>Transcriptie</ContextMenuLabel>
            <ContextMenuItem>
              <Copy /> Kopiëren
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <Pencil /> Hernoemen
            </ContextMenuItem>
            <ContextMenuItem>
              <Download /> Exporteren
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked>Vastgepind</ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">
            <Trash2 /> Verwijderen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
