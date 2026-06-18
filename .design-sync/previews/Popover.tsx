import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  Button,
} from "web";

export function Formulier() {
  return (
    <div style={{ padding: 16, minHeight: 320, display: "flex", justifyContent: "center" }}>
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="outline">Eigen woord toevoegen</Button>} />
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Eigen woord</PopoverTitle>
            <PopoverDescription>
              Voeg een naam of vakterm toe die het model vaak verkeerd hoort.
            </PopoverDescription>
          </PopoverHeader>
          <input
            defaultValue="Dicteren.ai"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 14,
            }}
          />
          <Button size="sm">Toevoegen</Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Info() {
  return (
    <div style={{ padding: 16, minHeight: 280, display: "flex", justifyContent: "center" }}>
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="ghost">Wat is AI-nabewerking?</Button>} />
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>AI-nabewerking</PopoverTitle>
            <PopoverDescription>
              Na het dicteren ruimt het model je tekst op: hoofdletters, leestekens
              en losse versprekingen. Je zet het aan in de zijbalk.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </div>
  );
}
