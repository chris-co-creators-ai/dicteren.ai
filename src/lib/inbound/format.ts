// Dicteren.ai — Inbound formatters. Google Ads gives money in *_micros
// (÷1e6 = EUR) and rates as 0–1. These mirror the Claude Design prototype's
// `fmt` helpers so the ported UI renders identically.

export const fmt = {
  eur(micros: number, dec = 0): string {
    const v = micros / 1e6;
    return "€" + v.toLocaleString("nl-NL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  },
  eur2(micros: number): string {
    return fmt.eur(micros, 2);
  },
  num(n: number): string {
    return Number(n).toLocaleString("nl-NL");
  },
  num1(n: number): string {
    return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 1 });
  },
  pct(rate: number, dec = 1): string {
    return (rate * 100).toLocaleString("nl-NL", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%";
  },
  date(s: string): string {
    return new Date(s).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  },
  dateLong(s: string): string {
    return new Date(s).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  },
  time(s: string): string {
    return new Date(s).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  },
  dt(s: string): string {
    return fmt.date(s) + " · " + fmt.time(s);
  },
  rel(s: string): string {
    const d = (Date.now() - new Date(s).getTime()) / 1000;
    if (d < 60) return "zojuist";
    if (d < 3600) return Math.floor(d / 60) + " min geleden";
    if (d < 86400) return Math.floor(d / 3600) + " u geleden";
    return Math.floor(d / 86400) + " d geleden";
  },
};
