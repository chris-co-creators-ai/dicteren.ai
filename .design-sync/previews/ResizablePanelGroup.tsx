import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "web";

export function Horizontal() {
  return (
    <div
      style={{
        width: 360,
        height: 180,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={45}>
          <div style={{ padding: 16, fontSize: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Geschiedenis</div>
            <p style={{ color: "var(--muted-foreground)" }}>
              Al je dicteer-sessies van vandaag.
            </p>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55}>
          <div style={{ padding: 16, fontSize: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Transcript</div>
            <p style={{ color: "var(--muted-foreground)" }}>
              Praat en je woorden verschijnen hier, in jouw eigen taal.
            </p>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
