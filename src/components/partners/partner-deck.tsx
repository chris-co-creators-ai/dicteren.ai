// Dicteren.ai — De volledige Partner Deck v2.5 als web-pagina (/partner/[token]).
//
// 1-op-1 reproductie van de PDF (Christians eigen deck), in onze huisstijl,
// gepersonaliseerd met firstName/companyName/audience (met veilige fallbacks).
// Bron: .claude/prds/partner-deck-page/. CTA's en het apply-formulier rendert de
// page eronder (#aanmelden).

import Image from "next/image";
import {
  Laptop,
  ShieldCheck,
  Languages,
  Globe,
  Lock,
  Repeat,
  AlignJustify,
  BarChart3,
  Users,
  Send,
  CalendarDays,
  Link2,
  Layers,
  PenLine,
  RefreshCw,
  Boxes,
  SlidersHorizontal,
  MessageSquareText,
  CreditCard,
  Sparkles,
  Briefcase,
  User,
  Check,
  Mic,
} from "lucide-react";

const AVATAR = "/branding/logo-icon-sm.png";
const LOGO = "/branding/logo-horizontal.png";
const GREEN = "#1F8A4C"; // groen — "praten"-kaart + checkmarks
const TEAL = "#3FB6BC"; // deck-teal voor accenten op lichte achtergrond

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diakrieten strippen (é → e)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ── Gedeelde bouwstenen ────────────────────────────────────────────────────

function TopBar({
  num,
  label,
  dark,
}: {
  num: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] ${
        dark ? "text-white/55" : "text-[color:var(--text-muted)]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-[color:var(--orange)]" />
        {num} · {label}
      </span>
      <span className={dark ? "text-white/30" : "text-[color:var(--border-soft)]"}>
        Partner Deck · V2.5
      </span>
    </div>
  );
}

function Eyebrow({
  num,
  label,
  dark,
}: {
  num: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
      <span className="text-[color:var(--orange)]">{num}</span>
      <span className={`h-px w-10 ${dark ? "bg-white/25" : "bg-[color:var(--border-soft)]"}`} />
      <span className={dark ? "text-white/55" : "text-[color:var(--text-muted)]"}>
        {label}
      </span>
    </div>
  );
}

function Avatar({ size = 56 }: { size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full bg-[color:var(--aqua-50)] ring-1 ring-[color:var(--aqua-200)]"
      style={{ width: size, height: size }}
    >
      <Image src={AVATAR} alt="Dicteren.ai" width={size - 18} height={size - 18} />
    </span>
  );
}

function LogoPill() {
  return (
    <span className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 shadow-sm">
      <Image src={LOGO} alt="Dicteren.ai" width={120} height={28} className="h-7 w-auto" />
    </span>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────

const TEAM = [
  { name: "Chris Bleeker", role: "Oprichter", photo: "/team/chris.jpg" },
  { name: "Brian", role: "Accountmanager", photo: "/team/brian.jpg" },
  { name: "Roy", role: "Accountmanager", photo: "/team/roy.jpg" },
  { name: "Lars", role: "Accountmanager", photo: "/team/lars.jpg" },
  { name: "Krishna", role: "Accountmanager", photo: "/team/krishna.jpg" },
];

const COMPARE: { k: string; us: string; them: string }[] = [
  { k: "Verwerking", us: "Lokaal op je computer", them: "In de cloud (VS)" },
  { k: "Nederlands taalmodel", us: "Eerste taal", them: "Ondersteund" },
  { k: "Audio verlaat je apparaat", us: "Nooit", them: "Standaard wel" },
  { k: "Werkt offline", us: "Ja, na installatie", them: "Internet nodig" },
  { k: "Datasoevereiniteit", us: "Bij jou", them: "Bij Wispr (VS)" },
  { k: "AVG / EU AI Act", us: "Als uitgangspunt", them: "Onduidelijk voor NL" },
  { k: "Werkt in elke app", us: "Ja", them: "Ja" },
  { k: "Vriendenprijs voor partners", us: "Ja", them: "Niet beschikbaar" },
];

const STEPS = [
  {
    n: "1",
    title: "Installeren",
    color: "var(--orange)",
    items: [
      "Download dicteren.ai en installeer 'm op je eigen computer.",
      "Werkt op Windows en Mac.",
      "Eenmalig, in een paar minuten klaar.",
    ],
  },
  {
    n: "2",
    title: "Inspreken",
    color: "var(--navy)",
    items: [
      "Druk je sneltoets in — in mail, CRM, browser of editor.",
      "Praat gewoon, in het Nederlands.",
      "Geen wachten, geen knippen-en-plakken.",
    ],
  },
  {
    n: "3",
    title: "Klaar",
    color: TEAL,
    items: [
      "Je woorden verschijnen direct als nette tekst.",
      "Alles lokaal verwerkt — niets verlaat je computer.",
      "Tot ±3× sneller dan typen.",
    ],
  },
];

const PILLARS = [
  {
    n: "01",
    color: "var(--orange)",
    icon: <Languages className="size-5" strokeWidth={1.8} />,
    title: "Commercieel",
    body: "Vriendenprijs voor je eigen gebruik, plus een commissie-bonus op elke klant die via jou binnenkomt.",
    chip: "Vriendenprijs + commissie",
  },
  {
    n: "02",
    color: "var(--navy)",
    icon: <BarChart3 className="size-5" strokeWidth={1.8} />,
    title: "Inzicht & grip",
    body: "Een eigen partnerportal met live funnel: je volgt elke aangeleverde klant van eerste klik tot betaling. Altijd actueel, altijd inzichtelijk.",
    chip: "Portal + live funnel",
  },
  {
    n: "03",
    color: TEAL,
    icon: <Users className="size-5" strokeWidth={1.8} />,
    title: "Zichtbaarheid & bereik",
    body: "Een eigen landingpagina, promomateriaal en korte, persoonlijke lijnen met het team. Hoe je het inzet, bepaal je zelf.",
    chip: "Eigen pagina + materiaal",
  },
];

const ON_TABLE = [
  { icon: <Sparkles className="size-4" strokeWidth={1.6} />, title: "Vriendenprijs op je licentie", sub: "Voor jou en je team." },
  { icon: <Repeat className="size-4" strokeWidth={1.6} />, title: "Commissie-bonus", sub: "Op elke klant via jou." },
  { icon: <CreditCard className="size-4" strokeWidth={1.6} />, title: "Eigen partnerportal met login", sub: "Persoonlijk dashboard." },
  { icon: <BarChart3 className="size-4" strokeWidth={1.6} />, title: "Live analytics-funnel", sub: "Klik tot betaling, per klant." },
  { icon: <Globe className="size-4" strokeWidth={1.6} />, title: "Eigen landingpagina", sub: "Op dicteren.ai, met backlink." },
  { icon: <MessageSquareText className="size-4" strokeWidth={1.6} />, title: "WhatsApp-lijn met het team", sub: "Korte vragen, snelle antwoorden." },
];

const FEATURES = [
  { icon: <Lock className="size-5" strokeWidth={1.8} />, title: "Lokaal & offline", sub: "Draait op de eigen computer." },
  { icon: <Globe className="size-5" strokeWidth={1.8} />, title: "Nederlands model", sub: "Gebouwd voor onze taal." },
  { icon: <Boxes className="size-5" strokeWidth={1.8} />, title: "Werkt in elke app", sub: "Mail, CRM, browser, editor." },
  { icon: <RefreshCw className="size-5" strokeWidth={1.8} />, title: "Gratis updates", sub: "Nieuwe modellen inbegrepen." },
];

const TIERS = [
  { seats: "1–4 seats", price: "€120", note: "geen korting", eg: "bv. 4 = €480/jr" },
  { seats: "5–9 seats", price: "€108", note: "10% korting", eg: "bv. 8 = €864/jr" },
  { seats: "10–24 seats", price: "€102", note: "15% korting", eg: "bv. 18 = €1.020/jr", popular: true },
  { seats: "25–49 seats", price: "€96", note: "20% korting", eg: "bv. 25 = €2.400/jr" },
];

const DELIVERABLES = [
  { icon: <Globe className="size-5" strokeWidth={1.8} />, title: "Eigen landingpagina", body: "Een eigen pagina op dicteren.ai/partners/jouw-bureau, met backlink naar jou." },
  { icon: <Link2 className="size-5" strokeWidth={1.8} />, title: "Eigen promo-URL", body: "Een trackbare link en kortingscode, zodat elke klant via jou herkenbaar binnenkomt." },
  { icon: <Layers className="size-5" strokeWidth={1.8} />, title: "Content aangeleverd", body: "Kant-en-klare posts, visuals en teksten die je zo kunt gebruiken." },
  { icon: <PenLine className="size-5" strokeWidth={1.8} />, title: "Content op maat", body: "Materiaal toegespitst op jouw doelgroep en in jouw huisstijl." },
];

const INTAKE = [
  { icon: <User className="size-5" strokeWidth={1.8} />, title: "Portretfoto", sub: "Hoge resolutie, rustige achtergrond." },
  { icon: <Briefcase className="size-5" strokeWidth={1.8} />, title: "Bedrijfslogo", sub: "SVG of PNG, transparant." },
  { icon: <AlignJustify className="size-5" strokeWidth={1.8} />, title: "Introtekst", sub: "60–100 woorden over jou." },
];

// ── De pagina ───────────────────────────────────────────────────────────────

export function PartnerDeck({
  firstName,
  companyName,
  audience,
}: {
  firstName?: string | null;
  companyName?: string | null;
  audience?: string | null;
}) {
  const company = companyName?.trim() || null;
  const companyUpper = company ? company.toUpperCase() : "JOUW BUREAU";
  const companySlug = company ? slugify(company) : "jouw-bureau";
  const greeting = firstName?.trim() ? `Hoi ${firstName.trim()}. ` : "";
  void audience;

  return (
    <div className="bg-white">
      {/* ═══════════ COVER / HERO (navy) ═══════════ */}
      <section className="bg-[color:var(--navy)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <LogoPill />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span className="size-1.5 rounded-full bg-[color:var(--orange)]" />
              Geselecteerde 25 partners · heel Nederland
            </span>
          </div>

          <div className="mt-16 grid gap-10 sm:mt-20 lg:grid-cols-2 lg:items-center">
            {/* Links */}
            <div>
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                <span className="h-px w-8 bg-white/40" />
                Partnerprogramma 2026
              </div>
              <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
                <span className="block">Eigen land.</span>
                <span className="block text-[color:var(--aqua)]">Eigen data.</span>
                <span className="block text-[color:var(--orange)]">Blijft lokaal.</span>
              </h1>
              <span className="mt-6 block h-1 w-12 rounded bg-[color:var(--orange)]" />
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/80">
                Het Nederlandse alternatief voor Wispr Flow. Volledig lokaal op je
                eigen computer. Bouw mee aan de Nederlandse standaard voor dicteren
                met AI.
              </p>
            </div>

            {/* Rechts — chat-mockup */}
            <div className="lg:justify-self-end">
              <div className="ml-auto flex max-w-sm flex-col items-end gap-4">
                <Avatar size={64} />
                <div className="w-full rounded-2xl bg-white p-5 text-[color:var(--navy)] shadow-xl">
                  <div className="flex items-center justify-between text-xs font-semibold text-[color:var(--text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded bg-[color:var(--navy)] text-[10px] font-bold text-white">
                        1
                      </span>
                      Space
                    </span>
                    <span>00:09</span>
                  </div>
                  <p className="mt-3 text-[15px] font-semibold leading-snug">
                    &quot;Stel een mail op naar onze nieuwe partner. Bedank ze voor
                    het gesprek en bevestig de kennismaking van komende donderdag.&quot;
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--orange-50)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--orange-600)]">
                      <Mic className="size-3" /> Lokaal verwerkt
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[color:var(--text-muted)]">
                      NL · V1
                    </span>
                  </div>
                </div>
                <div className="flex w-full gap-3">
                  <div className="flex w-28 flex-col justify-center rounded-2xl bg-[color:var(--orange)] p-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-wider">
                      Beperkt
                    </p>
                    <p className="text-3xl font-bold leading-none">25</p>
                    <p className="text-[11px]">plekken</p>
                  </div>
                  <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white p-4 text-[color:var(--navy)]">
                    <Repeat className="size-5 shrink-0 text-[color:var(--orange)]" strokeWidth={1.8} />
                    <div>
                      <p className="text-sm font-bold leading-tight">Commissie-bonus</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        op elke klant via jou
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer-strook */}
          <div className="mt-16 border-t border-white/12 pt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Waarom het er voor jouw klanten toe doet
            </p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: <Laptop className="size-5" strokeWidth={1.7} />, t: "Lokaal verwerkt", s: "Audio blijft op het apparaat." },
                { icon: <ShieldCheck className="size-5" strokeWidth={1.7} />, t: "AVG-vriendelijk", s: "Geen data over de oceaan." },
                { icon: <Languages className="size-5" strokeWidth={1.7} />, t: "EU AI Act-ready", s: "Transparant gedocumenteerd." },
                { icon: <Globe className="size-5" strokeWidth={1.7} />, t: "Datasoevereiniteit", s: "De controle blijft Nederlands." },
              ].map((f) => (
                <div key={f.t}>
                  <span className="text-white">{f.icon}</span>
                  <p className="mt-2 text-sm font-bold">{f.t}</p>
                  <p className="mt-0.5 text-[13px] text-white/60">{f.s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 01 · HET ECHTE PROBLEEM ═══════════ */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <TopBar num="01" label="Het echte probleem" />

        <div className="mt-8 flex items-center gap-4 rounded-2xl bg-[color:var(--navy)] p-5 text-white">
          <Avatar size={48} />
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--aqua)]">
              Welkom · 2 minuten leestijd
            </p>
            <p className="mt-1 text-[15px] font-medium leading-snug">
              {greeting}In heel Nederland kiezen we 25 partners. Jij leest dit omdat
              we denken dat jij er één bent.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-bold leading-none text-[color:var(--orange)]">25</p>
            <p className="text-[11px] text-white/70">plekken</p>
          </div>
        </div>

        <div className="mt-12">
          <Eyebrow num="01" label="Voor jou als AI-expert" />
          <h2 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[color:var(--navy)]">
            Als jij typt, ben je dan niet stiekem{" "}
            <span className="text-[color:var(--orange)]">aan het samenvatten?</span>
          </h2>
        </div>

        <div className="mt-8 grid items-stretch gap-5 lg:grid-cols-2">
          {/* Typen — rood */}
          <div className="flex flex-col rounded-2xl border border-[color:#f3d2d2] bg-[color:var(--red-50)] p-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--red)]">
              <AlignJustify className="size-4" /> Typen · de samenvatting
            </p>
            <p className="mt-4 text-lg font-semibold leading-snug text-[color:var(--navy)]">
              &quot;Schrijf mail naar klant over verzetten meeting.&quot;
            </p>
            <div className="mt-auto pt-10">
              <p className="text-6xl font-bold text-[color:var(--red)]">11</p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                woorden. De rest bleef in je hoofd.
              </p>
            </div>
          </div>
          {/* Praten — groen */}
          <div className="flex flex-col rounded-2xl border bg-[color:#eef7f1] p-6" style={{ borderColor: "#c3e3cd" }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: GREEN }}>
              <Mic className="size-4" /> Praten · de volle gedachte
            </p>
            <p className="mt-4 text-[15px] font-medium leading-snug text-[color:var(--navy)]">
              &quot;Schrijf een mail naar Sanne over het verzetten van de
              kennismaking. Vrijdag lukt niet, Chris heeft dan een spreekbeurt. Stel
              de week erna voor, in de middag. Toon vriendelijk maar zakelijk, ze is
              partner.&quot;
            </p>
            <div className="mt-auto flex items-end justify-between pt-6">
              <div>
                <p className="text-6xl font-bold" style={{ color: GREEN }}>49</p>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  woorden. Alle context, in 12 seconden.
                </p>
              </div>
              <span className="shrink-0 rounded-full border bg-white px-3 py-1.5 text-center text-[11px] font-semibold leading-tight" style={{ borderColor: "#c3e3cd", color: GREEN }}>
                1 keer
                <br />
                versturen
              </span>
            </div>
          </div>
        </div>

        {/* Onderzoek-banner */}
        <div className="mt-6 flex gap-4 rounded-2xl bg-[color:var(--navy)] p-6 text-white">
          <BarChart3 className="size-6 shrink-0 text-[color:var(--aqua)]" strokeWidth={1.8} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--aqua)]">
              Onderzoek · Stanford University (2016)
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-white/85">
              Mensen typen gemiddeld ±40 woorden per minuut, maar spreken er zo&apos;n
              150. Stanford mat dat dicteren in de praktijk{" "}
              <span className="font-bold text-white">±3× sneller</span> is dan typen —
              met <span className="font-bold text-white">~20% minder fouten</span>.{" "}
              <span className="text-[color:var(--aqua)]">hci.stanford.edu/research/speech →</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ 02 · HET ALTERNATIEF ═══════════ */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <TopBar num="02" label="Het alternatief" />
        <div className="mt-6">
          <Eyebrow num="02" label="Wispr Flow versus Dicteren.ai" />
          <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[color:var(--navy)]">
            Wat Wispr Flow doet. Maar dan{" "}
            <span className="text-[color:var(--orange)]">lokaal en Nederlands.</span>
          </h2>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[color:var(--border-soft)]">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-[color:var(--navy)] text-white">
            <div className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white/70">
              Kenmerk
            </div>
            <div className="flex items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-bold">
              <Image src={AVATAR} alt="" width={16} height={16} /> Dicteren.ai
            </div>
            <div className="px-4 py-3.5 text-center text-sm font-semibold text-white/60">
              Wispr Flow
            </div>
          </div>
          {COMPARE.map((row, i) => (
            <div
              key={row.k}
              className={`grid grid-cols-[1.5fr_1fr_1fr] items-center ${
                i % 2 ? "bg-[color:var(--aqua-50)]/40" : "bg-white"
              }`}
            >
              <div className="px-4 py-3.5 text-sm font-semibold text-[color:var(--navy)]">
                {row.k}
              </div>
              <div className="h-full bg-[color:var(--aqua-50)]/60 px-4 py-3.5 text-center text-sm font-bold text-[color:var(--navy)]">
                {row.us}
              </div>
              <div className="px-4 py-3.5 text-center text-sm text-[color:var(--text-muted)]">
                {row.them}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Eyebrow num="" label="Zo werk je ermee — in 3 stappen" />
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white"
              >
                <div className="h-1" style={{ background: s.color }} />
                <div className="p-6">
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.n}</p>
                  <p className="mt-1 text-lg font-bold text-[color:var(--navy)]">{s.title}</p>
                  <ul className="mt-3 space-y-2.5">
                    {s.items.map((it) => (
                      <li key={it} className="flex gap-2 text-sm text-[color:var(--text-muted)]">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[color:var(--orange-50)] p-6 sm:flex-row sm:items-center sm:gap-8">
          <p className="shrink-0 text-2xl font-bold text-[color:var(--orange-600)]">
            Easy does it!
          </p>
          <p className="text-[15px] leading-relaxed text-[color:var(--navy)]">
            Geen handleiding nodig — installeren, sneltoets indrukken en praten.
            Binnen een paar minuten dicteer je in elke app, volledig lokaal en in het
            Nederlands.
          </p>
        </div>
      </section>

      {/* ═══════════ 03 · MANIFEST (navy) ═══════════ */}
      <section className="bg-[color:var(--navy)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <TopBar num="03" label="Manifest" dark />
          <div className="mt-6">
            <Eyebrow num="03" label="Manifest" dark />
            <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Amerikaans is de norm.
              <br />
              <span className="text-[color:var(--orange)]">Wij vinden dat onnodig.</span>
            </h2>
          </div>

          <p className="mt-8 text-lg font-bold text-[color:var(--aqua)]">
            Het is niet meer van deze tijd.
          </p>
          <div className="mt-4 max-w-2xl space-y-4 text-[15px] leading-relaxed text-white/80">
            <p>
              De meeste dicteer- en AI-tools sturen je stem naar de cloud, meestal
              naar servers van Amerikaanse techbedrijven. Daar wordt je audio
              verwerkt, bewaard en vaak gebruikt om het volgende model te trainen. Op
              jouw woorden, en op het werk van je klanten.
            </p>
            <p>
              En het blijft niet bij dat ene bedrijf. Onder de Amerikaanse CLOUD Act
              kan de VS die data opvragen, ook als ze in een Europees datacenter
              staat. Niet voor niets zoeken Europese overheden en rechtbanken steeds
              vaker een eigen alternatief.
            </p>
            <p>
              Wij doen het anders. Een Nederlandse stem hoeft de oceaan niet over om
              begrepen te worden. Het MKB verdient AI die gewoon werkt, zonder dat er
              iemand meekijkt. Techniek hoort zich naar de mens te voegen, niet de
              mens naar de techniek.
            </p>
          </div>

          <div className="mt-8 flex gap-4 rounded-2xl border border-white/15 bg-black/15 p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--orange)]">
              <Lock className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-base font-bold">Daarom draait dicteren.ai volledig lokaal.</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                Je stem wordt op je eigen computer omgezet naar tekst en verlaat je
                apparaat nooit. Geen cloud om op te eisen, niets om mee te trainen.
                Voor jou, en voor je klanten.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-white/15 sm:grid-cols-4 sm:divide-x sm:divide-white/15">
            {[
              { icon: <Layers className="size-4" strokeWidth={1.7} />, t: "Lokaal verwerkt" },
              { icon: <ShieldCheck className="size-4" strokeWidth={1.7} />, t: "AVG-proof" },
              { icon: <Languages className="size-4" strokeWidth={1.7} />, t: "EU AI Act" },
              { icon: <Globe className="size-4" strokeWidth={1.7} />, t: "Datasoeverein" },
            ].map((c) => (
              <div key={c.t} className="flex items-center gap-2 px-4 py-3.5 text-sm font-semibold">
                <span className="text-[color:var(--aqua)]">{c.icon}</span>
                {c.t}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-2 border-t border-white/12 pt-8 sm:grid-cols-[auto_1fr] sm:gap-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Onze belofte
            </p>
            <p className="max-w-xl text-lg font-bold leading-snug">
              Wat jij of je klant inspreekt, blijft lokaal. Geen uitzonderingen.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ 04 · HET TEAM ═══════════ */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <TopBar num="04" label="Het team" />
        <div className="mt-6">
          <Eyebrow num="04" label="Het team" />
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-[color:var(--navy)]">
            Klein team. <span className="text-[color:var(--orange)]">Korte lijnen.</span>
          </h2>
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--text-muted)]">
          Geen callcenter, geen tussenlagen. Een vast, klein team dat je bij naam
          kent — Chris, Brian, Roy, Lars en Krishna. Altijd direct contact met een
          bekend gezicht.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {TEAM.map((m) => (
            <div key={m.name}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[color:var(--border-soft)]">
                <Image src={m.photo} alt={m.name} fill className="object-cover" sizes="(max-width: 768px) 45vw, 18vw" />
              </div>
              <p className="mt-3 text-base font-bold text-[color:var(--navy)]">{m.name}</p>
              <p className="text-sm text-[color:var(--orange)]">{m.role}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-10 grid gap-6 rounded-2xl border-l-4 bg-[color:var(--aqua-50)]/50 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"
          style={{ borderColor: "var(--orange)" }}
        >
          <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-xl bg-[color:var(--border-soft)] shadow-lg">
            <Image src="/team/christian-bleeker.jpg" alt="Chris Bleeker — TEDxEindhoven 2025" fill className="object-cover" sizes="(max-width: 1024px) 80vw, 30vw" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--orange)]">
              TEDxEindhoven · AI-advisor
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--text-muted)]">
              Oprichter Chris sprak op{" "}
              <span className="font-semibold text-[color:var(--navy)]">TEDxEindhoven 2025</span>{" "}
              en is AI-advisor van TEDxEindhoven. Hij bouwde de transparante
              partner-CRM zelf — je ziet exact waar elke aangeleverde klant zit. Geen
              black box.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ 05 · DE SAMENWERKING ═══════════ */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <TopBar num="05" label="De samenwerking" />
        <div className="mt-10 flex flex-wrap items-start gap-6">
          <div className="border-r border-[color:var(--border-soft)] pr-6">
            <p className="text-6xl font-bold leading-none text-[color:var(--orange)]">25</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
              Partners · heel NL
            </p>
          </div>
          <div className="flex-1">
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-[color:var(--navy)]">
              Elke partner
              <br />
              een eigen deal.
            </h2>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--text-muted)]">
          Met elke partner maken we aparte afspraken, passend bij je netwerk, je
          doelgroep en wat je wilt bereiken. De samenwerking loopt over drie vlakken:
          commercieel, inzicht en zichtbaarheid.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.n} className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white">
              <div className="h-1" style={{ background: p.color }} />
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-[color:var(--aqua-50)] text-[color:var(--navy)]">
                    {p.icon}
                  </span>
                  <span className="text-sm font-bold text-[color:var(--text-muted)]">{p.n}</span>
                </div>
                <p className="mt-4 text-lg font-bold text-[color:var(--navy)]">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">{p.body}</p>
                <span className="mt-4 inline-block rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--navy)]">
                  {p.chip}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Wat we op tafel leggen
        </p>
        <div className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {ON_TABLE.map((it) => (
            <div key={it.title} className="flex items-start gap-3 border-b border-[color:var(--border-soft)] pb-4">
              <span className="mt-0.5 text-[color:var(--aqua)]">{it.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[color:var(--navy)]">{it.title}</p>
                <p className="text-[13px] text-[color:var(--text-muted)]">{it.sub}</p>
              </div>
              <Check className="size-4 shrink-0" style={{ color: GREEN }} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ 06 · VRIENDENPRIJS ═══════════ */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <TopBar num="06" label="Vriendenprijs" />
        <div className="mt-6">
          <Eyebrow num="06" label="Prijs & verdienste" />
          <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[color:var(--navy)]">
            Heldere prijzen.{" "}
            <span className="text-[color:var(--orange)]">Commissie op maat.</span>
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
              <span className="text-[color:var(--orange)]">{f.icon}</span>
              <p className="mt-3 text-base font-bold text-[color:var(--navy)]">{f.title}</p>
              <p className="mt-1 text-[13px] text-[color:var(--text-muted)]">{f.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Zakelijke staffel · per seat, per jaar
          </p>
          <span className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--aqua-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--navy)]">
            Uitsluitend jaarlijks
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t) => (
            <div
              key={t.seats}
              className={`relative overflow-hidden rounded-2xl border bg-white ${
                t.popular ? "border-[color:var(--aqua)]" : "border-[color:var(--border-soft)]"
              }`}
            >
              {t.popular && (
                <>
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-md bg-[color:var(--aqua)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--navy)]">
                    Populair
                  </span>
                  <div className="h-1 bg-[color:var(--aqua)]" />
                </>
              )}
              <div className={`p-5 ${t.popular ? "pt-6" : ""}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                  {t.seats}
                </p>
                <p className="mt-2 text-3xl font-bold text-[color:var(--navy)]">{t.price}</p>
                <p className="text-[13px] text-[color:var(--text-muted)]">{t.note}</p>
                <p className="mt-3 border-t border-[color:var(--border-soft)] pt-3 font-mono text-xs text-[color:var(--text-muted)]">
                  {t.eg}
                </p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-[color:var(--navy)] p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              50+ seats
            </p>
            <p className="mt-2 text-2xl font-bold">maatwerk</p>
            <p className="text-[13px] text-white/60">offerte</p>
            <p className="mt-3 font-mono text-xs text-white/50">samen bepaald</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-[color:var(--text-muted)]">
          Prijzen per seat/jaar zoals op dicteren.ai/prijzen. Geen maand- of
          kwartaaltermijn voor zakelijk gebruik.
        </p>

        <div className="mt-6 flex gap-4 rounded-2xl bg-[color:var(--orange-50)] p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--orange)] text-white">
            <Repeat className="size-5" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-base font-bold text-[color:var(--navy)]">
              Jouw verdienste: commissie op maat.
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--text-muted)]">
              Geen massaprogramma — we bepalen samen je commissie-bonus op elke klant
              die via jou binnenkomt, passend bij je netwerk en inzet.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ 07 · STRATEGISCHE SAMENWERKING ═══════════ */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <TopBar num="07" label="Strategische samenwerking" />
        <div className="mt-6">
          <Eyebrow num="07" label="Strategische samenwerking" />
          <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[color:var(--navy)]">
            Wij bouwen het.{" "}
            <span className="text-[color:var(--orange)]">Jij zet je naam erop.</span>
          </h2>
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--text-muted)]">
          Je krijgt een eigen plek op dicteren.ai, een eigen promolink en
          kant-en-klaar materiaal. Naar buiten treden mag, maar het hoeft niet: jij
          bepaalt hoe zichtbaar je wilt zijn.
        </p>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Wat wij voor je leveren
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DELIVERABLES.map((d) => (
            <div key={d.title} className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
              <span className="text-[color:var(--orange)]">{d.icon}</span>
              <p className="mt-3 text-base font-bold text-[color:var(--navy)]">{d.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--text-muted)]">{d.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4 rounded-2xl bg-[color:var(--navy)] p-6 text-white">
          <SlidersHorizontal className="size-5 shrink-0 text-[color:var(--aqua)]" strokeWidth={1.8} />
          <p className="text-[14px] leading-relaxed text-white/85">
            Elkaar promoten op social mag, maar het is geen voorwaarde. Wat je deelt
            en wanneer, bepaal je helemaal zelf.
          </p>
        </div>

        <p className="mt-12 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Voor serieuze partners · je eigen landingpagina
        </p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[color:var(--border-soft)] bg-[color:#f4f8fd] px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-[color:var(--border-soft)]" />
              <span className="size-2.5 rounded-full bg-[color:var(--border-soft)]" />
              <span className="size-2.5 rounded-full bg-[color:var(--border-soft)]" />
              <span className="ml-2 truncate rounded-md bg-white px-3 py-1 text-xs text-[color:var(--text-muted)]">
                dicteren.ai/partners/{companySlug}
              </span>
            </div>
            <div className="grid items-center gap-4 p-6 sm:grid-cols-2">
              <div>
                <span className="inline-block rounded-full bg-[color:var(--orange-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--orange-600)]">
                  Samen met {companyUpper}
                </span>
                <p className="mt-3 text-2xl font-bold leading-tight text-[color:var(--navy)]">
                  Dicteren.ai, speciaal voor jouw doelgroep.
                </p>
                <p className="mt-3 text-[13px] italic text-[color:var(--text-muted)]">
                  &quot;Wij gebruiken het zelf en raden het onze klanten aan.&quot; — jouw quote
                </p>
              </div>
              <div
                className="grid place-items-center rounded-xl border border-dashed border-[color:var(--border-soft)] p-8 text-center"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--aqua-50) 0 10px, white 10px 20px)",
                }}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Jouw logo
                </span>
                <span className="mt-3 block text-[10px] uppercase tracking-wide text-[color:var(--text-muted)]">
                  Uw bedrijfsafbeelding in eigen huisstijl
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[15px] leading-relaxed text-[color:var(--text-muted)]">
              We bouwen een dedicated pagina met{" "}
              <span className="font-semibold text-[color:var(--navy)]">backlink naar jou.</span>{" "}
              Daarvoor hebben we nodig:
            </p>
            <div className="mt-5 space-y-4">
              {INTAKE.map((i) => (
                <div key={i.title} className="flex items-start gap-3 border-b border-[color:var(--border-soft)] pb-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--orange-50)] text-[color:var(--orange-600)]">
                    {i.icon}
                  </span>
                  <div>
                    <p className="text-base font-bold text-[color:var(--navy)]">{i.title}</p>
                    <p className="text-[13px] text-[color:var(--text-muted)]">{i.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 08 · HOE VERDER (navy) ═══════════ */}
      <section className="bg-[color:var(--navy)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex items-start justify-between gap-4">
            <div>
              {/* Pagina 9 heeft rechts het logo i.p.v. de "Partner Deck"-running header. */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <span className="size-1.5 rounded-full bg-[color:var(--orange)]" />
                08 · Hoe verder
              </div>
              <div className="mt-3">
                <Eyebrow num="08" label="Hoe verder" dark />
              </div>
            </div>
            <LogoPill />
          </div>

          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Klaar om een van de{" "}
            <span className="text-[color:var(--aqua)]">25</span> te worden?
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75">
            We vullen de plekken op volgorde van aanmelding en aansluiting. Twee
            manieren om te reageren — allebei via je vaste contactpersoon.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[color:var(--orange)] p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                  Optie A
                </p>
                <Send className="size-5" strokeWidth={1.8} />
              </div>
              <p className="mt-3 text-xl font-bold">Reageer op de mail.</p>
              <p className="mt-2 text-[14px] leading-relaxed text-white/90">
                Antwoord op de mail van je contactpersoon. Eén zin is genoeg. We
                bellen binnen 2 werkdagen.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Optie B
                </p>
                <CalendarDays className="size-5 text-[color:var(--aqua)]" strokeWidth={1.8} />
              </div>
              <p className="mt-3 text-xl font-bold">Bakkie met je accountmanager.</p>
              <p className="mt-2 text-[14px] leading-relaxed text-white/70">
                Liever sparren? Vraag een digitaal bakkie koffie met je eigen
                accountmanager. Een half uur, geen agenda.
              </p>
            </div>
          </div>

          <div className="mt-16 flex items-center gap-5">
            <h3 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Ciao <span className="text-[color:var(--aqua)]">for now!</span>
            </h3>
            <Avatar size={64} />
          </div>
          <p className="mt-2 text-[15px] text-white/70">
            — Chris, Brian, Roy, Lars en Krishna
          </p>

          <div className="mt-12 grid overflow-hidden rounded-xl border border-white/12 sm:grid-cols-3 sm:divide-x sm:divide-white/12">
            {[
              { l: "Website", v: "dicteren.ai", aqua: true },
              { l: "Mail", v: "info@dicteren.ai" },
              { l: "Basis", v: "Startup Nijmegen · KvK 97026212" },
            ].map((c) => (
              <div key={c.l} className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  {c.l}
                </p>
                <p className={`mt-1 text-lg font-bold ${c.aqua ? "text-[color:var(--aqua)]" : ""}`}>
                  {c.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
