import { Toaster, Button } from "web";
import { toast } from "sonner";

export function Default() {
  return (
    <div style={{ position: "relative", minHeight: 80 }}>
      <Button
        size="sm"
        onClick={() =>
          toast.success("Licentiecode verstuurd", {
            description: "Check je mail van info@dicteren.ai.",
          })
        }
      >
        Toon melding
      </Button>
      <Toaster />
    </div>
  );
}
