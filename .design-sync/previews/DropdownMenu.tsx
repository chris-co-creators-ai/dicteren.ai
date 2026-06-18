import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
  Button,
} from "web";
import { ChevronDown, User, CreditCard, LogOut, Settings } from "lucide-react";

export function Default() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" style={{ display: "inline-flex", gap: 6 }}>
              Account <ChevronDown style={{ width: 16, height: 16 }} />
            </Button>
          }
        />
        <DropdownMenuContent style={{ width: 220 }}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Mijn account</DropdownMenuLabel>
            <DropdownMenuItem>
              <User /> Profiel
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard /> Abonnement
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Instellingen
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <LogOut /> Uitloggen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function MetCheckboxEnSubmenu() {
  return (
    <div style={{ padding: 16, minHeight: 360 }}>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" style={{ display: "inline-flex", gap: 6 }}>
              Weergave <ChevronDown style={{ width: 16, height: 16 }} />
            </Button>
          }
        />
        <DropdownMenuContent style={{ width: 240 }}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Geschiedenis</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked>
              Geluidssignalen
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>AI-nabewerking</DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>Periode</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Deze maand</DropdownMenuItem>
              <DropdownMenuItem>Dit kwartaal</DropdownMenuItem>
              <DropdownMenuItem>Dit jaar</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
