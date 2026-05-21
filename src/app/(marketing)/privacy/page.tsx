import { PagePlaceholder } from "@/components/marketing/page-placeholder";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PagePlaceholder
      chip="Privacy"
      title="Privacyverklaring volgt"
      description="De definitieve privacyverklaring wordt opgesteld in samenspraak met onze DPO. In het kort: lokale spraakverwerking, geen audio-uploads, geen tracking op je stem. Volledige tekst beschikbaar voor de eerste publieke launch."
    />
  );
}
