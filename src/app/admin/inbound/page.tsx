import "./inbound.css";
import { getInboundData } from "@/lib/inbound/data";
import { InboundApp } from "@/components/admin/inbound/inbound-app";

export const metadata = {
  title: "Inbound · Dicteren.ai",
  description: "PPC/advertising-dashboard — Vicky",
};

// getInboundData() returns deterministic sample data today (token is test-only);
// the Neon sync replaces it later without touching the UI.
export default function InboundPage() {
  const data = getInboundData();
  return (
    <div className="inbound-root">
      <InboundApp data={data} />
    </div>
  );
}
