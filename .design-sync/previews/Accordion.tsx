import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "web";

export function Default() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="offline"
      style={{ maxWidth: 460 }}
    >
      <AccordionItem value="offline">
        <AccordionTrigger>Heb ik internet nodig?</AccordionTrigger>
        <AccordionContent>
          Nee. Dicteren.ai werkt offline. Je stem blijft op je eigen computer en
          de tekst verschijnt direct waar je cursor staat.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="data">
        <AccordionTrigger>Waar blijft mijn data?</AccordionTrigger>
        <AccordionContent>
          Je spraak en transcriptie blijven lokaal. Wij verwerken alleen je
          accountgegevens en facturatiegegevens.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="proef">
        <AccordionTrigger>Hoe werkt de proefperiode?</AccordionTrigger>
        <AccordionContent>
          Je probeert 14 dagen gratis. Geen creditcard nodig. Daarna stopt de
          toegang automatisch.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
