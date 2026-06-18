import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "web";
import { MicIcon, KeyboardIcon, ShieldCheckIcon, ClockIcon } from "lucide-react";

const features = [
  {
    icon: MicIcon,
    title: "Praat je tekst in",
    desc: "Druk op een sneltoets, praat, je tekst verschijnt waar je cursor staat.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Blijft op je computer",
    desc: "Je stem wordt lokaal verwerkt. Wij ontvangen je audio nooit.",
  },
  {
    icon: KeyboardIcon,
    title: "Werkt overal",
    desc: "In Word, in je mail, in WhatsApp Web. Klik en praat.",
  },
  {
    icon: ClockIcon,
    title: "Sneller dan typen",
    desc: "Spreken gaat rond de 150 woorden per minuut. Typen hooguit 30.",
  },
];

export function Default() {
  return (
    <div style={{ padding: "0 56px" }}>
      <Carousel style={{ width: 320 }}>
        <CarouselContent>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <CarouselItem key={f.title}>
                <Card>
                  <CardHeader>
                    <Icon style={{ width: 22, height: 22, marginBottom: 8 }} />
                    <CardTitle>{f.title}</CardTitle>
                    <CardDescription>{f.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                      Onderdeel van Dicteren.ai V3
                    </span>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
