import { Collapsible, CollapsibleTrigger, CollapsibleContent, Button } from "web";
import { ChevronsUpDown } from "lucide-react";

const list: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingTop: 8,
  color: "var(--muted-foreground)",
  fontSize: 14,
};

const item: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  padding: "8px 12px",
};

export function Default() {
  return (
    <Collapsible defaultOpen style={{ maxWidth: 360 }}>
      <CollapsibleTrigger
        render={
          <Button
            variant="outline"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            Eigen woorden (3)
            <ChevronsUpDown />
          </Button>
        }
      />
      <CollapsibleContent style={list}>
        <div style={item}>Keyholders</div>
        <div style={item}>iDEAL</div>
        <div style={item}>btw-nummer</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
