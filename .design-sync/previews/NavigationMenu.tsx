import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "web";

export function Default() {
  return (
    <div style={{ padding: 16, minHeight: 280, display: "flex", justifyContent: "center" }}>
      <NavigationMenu defaultValue="product">
        <NavigationMenuList>
          <NavigationMenuItem value="product">
            <NavigationMenuTrigger>Product</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div style={{ display: "grid", gap: 4, width: 280, padding: 4 }}>
                <NavigationMenuLink href="/download">
                  Download voor Mac en Windows
                </NavigationMenuLink>
                <NavigationMenuLink href="/prijzen">
                  Bekijk de prijzen
                </NavigationMenuLink>
                <NavigationMenuLink href="/privacy">
                  Privacy en lokale verwerking
                </NavigationMenuLink>
                <NavigationMenuLink href="/ai-model">
                  Over ons model
                </NavigationMenuLink>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="zakelijk">
            <NavigationMenuTrigger>Zakelijk</NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/contact">Contact</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
