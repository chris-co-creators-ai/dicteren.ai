import { HoverCard, HoverCardTrigger, HoverCardContent, Button } from "web";

export function LicentieDetail() {
  return (
    <div style={{ padding: 16, minHeight: 280, display: "flex", justifyContent: "center" }}>
      <HoverCard defaultOpen>
        <HoverCardTrigger render={<Button variant="link">Sanne van den Berg</Button>} />
        <HoverCardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Sanne van den Berg</span>
            <span style={{ color: "var(--muted-foreground)" }}>
              KvD Advocaten, jaarabonnement
            </span>
            <span style={{ color: "var(--muted-foreground)" }}>
              Licentie actief sinds januari 2026.
            </span>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
