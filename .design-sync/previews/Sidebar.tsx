import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "web";
import {
  LayoutGridIcon,
  KeyRoundIcon,
  ReceiptIcon,
  SettingsIcon,
  CircleUserIcon,
} from "lucide-react";

const nav = [
  { icon: LayoutGridIcon, label: "Overzicht", active: true },
  { icon: KeyRoundIcon, label: "Licenties", active: false },
  { icon: ReceiptIcon, label: "Facturen", active: false },
  { icon: SettingsIcon, label: "Instellingen", active: false },
];

export function Default() {
  return (
    <div style={{ height: 320, width: 300, border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarHeader>
            <div style={{ padding: 4, fontWeight: 600 }}>Dicteren.ai</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton isActive={item.active}>
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <CircleUserIcon />
                  <span>Sanne de Vries</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
}
