import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Button,
} from "web";
import { Mic } from "lucide-react";

export function Standaard() {
  return (
    <div style={{ padding: 48, minHeight: 200, display: "flex", justifyContent: "center" }}>
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger render={<Button variant="outline">Dicteren starten</Button>} />
          <TooltipContent>Houd option + spatie ingedrukt</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function MetIcoon() {
  return (
    <div style={{ padding: 48, minHeight: 200, display: "flex", justifyContent: "center" }}>
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger
            render={
              <Button size="icon" variant="ghost" aria-label="Microfoon">
                <Mic />
              </Button>
            }
          />
          <TooltipContent>Microfoontoegang nodig</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
