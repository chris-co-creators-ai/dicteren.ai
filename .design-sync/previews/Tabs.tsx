import { Tabs, TabsList, TabsTrigger, TabsContent } from "web";

const panel: React.CSSProperties = {
  paddingTop: 12,
  color: "var(--muted-foreground)",
  maxWidth: 420,
};

export function Default() {
  return (
    <Tabs defaultValue="overzicht" style={{ maxWidth: 460 }}>
      <TabsList>
        <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
        <TabsTrigger value="facturen">Facturen</TabsTrigger>
        <TabsTrigger value="instellingen">Instellingen</TabsTrigger>
      </TabsList>
      <TabsContent value="overzicht" style={panel}>
        Je jaarabonnement loopt tot 14 juni 2027. Drie van de vijf plekken zijn
        in gebruik.
      </TabsContent>
      <TabsContent value="facturen" style={panel}>
        Laatste factuur van 14 juni 2026 staat klaar. Betaald via iDEAL.
      </TabsContent>
      <TabsContent value="instellingen" style={panel}>
        Beheer je facturatiegegevens en de e-mail waarop je de licentiecode
        ontvangt.
      </TabsContent>
    </Tabs>
  );
}

export function LineVariant() {
  return (
    <Tabs defaultValue="facturen" style={{ maxWidth: 460 }}>
      <TabsList variant="line">
        <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
        <TabsTrigger value="facturen">Facturen</TabsTrigger>
        <TabsTrigger value="instellingen">Instellingen</TabsTrigger>
      </TabsList>
      <TabsContent value="overzicht" style={panel}>
        Je abonnement is actief op één Mac en één Windows-computer.
      </TabsContent>
      <TabsContent value="facturen" style={panel}>
        Alle facturen staan op naam van Acme B.V. en bevatten je btw-nummer.
      </TabsContent>
      <TabsContent value="instellingen" style={panel}>
        Stel in op welk adres de team-uitnodigingen binnenkomen.
      </TabsContent>
    </Tabs>
  );
}
