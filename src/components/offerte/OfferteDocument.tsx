// Dicteren.ai — Offerte-PDF (react-pdf, server-side render)
//
// Drie sjablonen op één datamodel (OfferteDocData). Allemaal met de wettelijke
// NL-offerte-onderdelen: afzender (naam/adres/KvK/BTW), klant t.a.v., uniek
// offertenummer + datum + geldig tot, prijstabel, subtotaal excl. btw → 21% btw
// → totaal incl., akkoord-regel en verwijzing naar de algemene voorwaarden.
//
// react-pdf leest geen CSS-vars: merk-hex hieronder hardcoded (= globals.css).
// Copy is concept en valt onder de TOV-gate tot Christians akkoord.

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  euroCents,
  type OfferteDocData,
  type OfferteLineItem,
} from "@/lib/services/offerteShared";
import { periodLabelNl } from "@/lib/services/pricingTiers";

// Lato (OFL) wordt ingebed zodat de PDF overal identiek rendert — niet afhankelijk
// van of de viewer een standaard-font heeft. De route geeft origin-URL's mee
// (self-fetch, zoals het logo), het sample-script een lokaal pad.
let fontsRegistered = false;
export function registerOfferteFonts(regularSrc: string, boldSrc: string): void {
  if (fontsRegistered) return;
  Font.register({
    family: "Lato",
    fonts: [
      { src: regularSrc, fontWeight: 400 },
      { src: boldSrc, fontWeight: 700 },
    ],
  });
  // Geen automatische woordafbreking — houdt bedragen en labels heel.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const C = {
  navy: "#042660",
  navy700: "#0b3478",
  aqua: "#8BE1E5",
  aqua50: "#e8f8f9",
  orange: "#FF8441",
  textMuted: "#4a6080",
  text: "#1a2b40",
  border: "#E2E6ED",
  softBg: "#F6F8FB",
  white: "#FFFFFF",
};

export type OfferteDocProps = {
  data: OfferteDocData;
  templateKey: "minimalist" | "klassiek" | "merk";
  /** Volledig horizontaal logo (navy op wit) — voor de witte sjablonen. */
  logoSrc?: string | null;
  /** Alleen het mascotte-icoon — leesbaar op de navy merk-balk. */
  iconSrc?: string | null;
};

function fmtDate(value: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function periodSuffix(period: string): string {
  if (period === "monthly" || period === "quarterly" || period === "yearly") {
    return `per ${periodLabelNl(period)}`;
  }
  return "";
}

function buyerAddressLines(b: OfferteDocData["buyer"]): string[] {
  const lines: string[] = [];
  if (b.addressLine1) lines.push(b.addressLine1);
  if (b.addressLine2) lines.push(b.addressLine2);
  const pc = [b.postalCode, b.city].filter(Boolean).join("  ");
  if (pc) lines.push(pc);
  return lines;
}

const TERMS_NOTE =
  "Op deze offerte zijn onze algemene voorwaarden van toepassing: dicteren.ai/voorwaarden.";
const VAT_NOTE = "Bedragen zijn exclusief btw; het btw-bedrag staat apart vermeld.";

// ── Gedeelde regel-tabel ─────────────────────────────────────────────────────

function LineItemsTable({
  items,
  accent,
  zebra,
}: {
  items: OfferteLineItem[];
  accent: string;
  zebra?: boolean;
}) {
  return (
    <View style={{ marginTop: 6 }}>
      {/* Kop */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1.5,
          borderBottomColor: accent,
          paddingBottom: 4,
          paddingTop: 2,
        }}
      >
        <Text style={[tbl.cellDesc, tbl.head]}>Omschrijving</Text>
        <Text style={[tbl.cellQty, tbl.head]}>Aantal</Text>
        <Text style={[tbl.cellUnit, tbl.head]}>Per stuk</Text>
        <Text style={[tbl.cellTotal, tbl.head]}>Totaal</Text>
      </View>
      {items.map((it, i) => (
        <View
          key={i}
          style={[
            tbl.row,
            zebra && i % 2 === 1 ? { backgroundColor: C.softBg } : {},
          ]}
        >
          <Text style={tbl.cellDesc}>{it.description}</Text>
          <Text style={tbl.cellQty}>{it.qty}</Text>
          <Text style={tbl.cellUnit}>{euroCents(it.unitNetCents)}</Text>
          <Text style={tbl.cellTotal}>{euroCents(it.netCents)}</Text>
        </View>
      ))}
    </View>
  );
}

function Totals({
  data,
  accent,
  boxed,
}: {
  data: OfferteDocData;
  accent: string;
  boxed?: boolean;
}) {
  return (
    <View style={{ alignItems: "flex-end", marginTop: 10 }}>
      <View style={{ width: "55%" }}>
        <View style={tbl.totalRow}>
          <Text style={tbl.totalLabel}>Subtotaal excl. btw</Text>
          <Text style={tbl.totalVal}>{euroCents(data.netCents)}</Text>
        </View>
        <View style={tbl.totalRow}>
          <Text style={tbl.totalLabel}>Btw 21%</Text>
          <Text style={tbl.totalVal}>{euroCents(data.vatCents)}</Text>
        </View>
        <View
          style={[
            tbl.totalRow,
            {
              marginTop: 4,
              paddingTop: 6,
              paddingBottom: boxed ? 6 : 0,
              paddingHorizontal: boxed ? 8 : 0,
              borderTopWidth: boxed ? 0 : 1.5,
              borderTopColor: accent,
              backgroundColor: boxed ? accent : "transparent",
              borderRadius: boxed ? 4 : 0,
            },
          ]}
        >
          <Text
            style={[
              tbl.totalLabel,
              { fontWeight: "bold", color: boxed ? C.white : C.navy },
            ]}
          >
            Totaal incl. btw
          </Text>
          <Text
            style={[
              tbl.grandVal,
              { color: boxed ? C.white : C.navy },
            ]}
          >
            {euroCents(data.grossCents)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Sjabloon 1: Strak / minimalist ──────────────────────────────────────────

function MinimalistPage({ data, logoSrc }: { data: OfferteDocData; logoSrc?: string | null }) {
  const seller = data.seller;
  return (
    <Page size="A4" style={min.page}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          {logoSrc ? (
            <Image src={logoSrc} style={{ height: 26, objectFit: "contain" }} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: "bold", color: C.navy }}>
              Dicteren.ai
            </Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: C.navy, letterSpacing: 1 }}>
            OFFERTE
          </Text>
          <Text style={min.metaLine}>{data.quoteNumber}</Text>
          <Text style={min.metaLine}>{fmtDate(data.createdAt)}</Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: C.border, marginTop: 14, marginBottom: 16 }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ width: "48%" }}>
          <Text style={min.blockLabel}>Van</Text>
          <Text style={min.party}>{seller.name}</Text>
          {seller.address ? <Text style={min.partyLine}>{seller.address}</Text> : null}
          {seller.kvk ? <Text style={min.partyLine}>KvK {seller.kvk}</Text> : null}
          {seller.vat ? <Text style={min.partyLine}>Btw {seller.vat}</Text> : null}
          <Text style={min.partyLine}>{seller.email}</Text>
        </View>
        <View style={{ width: "48%" }}>
          <Text style={min.blockLabel}>Voor</Text>
          {data.buyer.contactName ? (
            <Text style={min.partyLine}>t.a.v. {data.buyer.contactName}</Text>
          ) : null}
          <Text style={min.party}>{data.buyer.name}</Text>
          {buyerAddressLines(data.buyer).map((l, i) => (
            <Text key={i} style={min.partyLine}>{l}</Text>
          ))}
          {data.buyer.kvk ? <Text style={min.partyLine}>KvK {data.buyer.kvk}</Text> : null}
          {data.buyer.vatNumber ? <Text style={min.partyLine}>Btw {data.buyer.vatNumber}</Text> : null}
        </View>
      </View>

      {data.introText ? <Text style={min.intro}>{data.introText}</Text> : null}

      <LineItemsTable items={data.lineItems} accent={C.navy} />
      <Totals data={data} accent={C.navy} />

      <View style={{ marginTop: 18 }}>
        <Text style={min.validity}>Geldig tot {fmtDate(data.validUntil)}.</Text>
        {data.closingText ? <Text style={min.closing}>{data.closingText}</Text> : null}
        <Text style={min.akkoord}>Akkoord? Mail je bevestiging naar {seller.email}.</Text>
        <Text style={min.fine}>{VAT_NOTE}</Text>
        <Text style={min.fine}>{TERMS_NOTE}</Text>
      </View>

      <View style={min.footer} fixed>
        <Text style={min.footerText}>
          {[seller.name, seller.kvk ? `KvK ${seller.kvk}` : null, seller.vat ? `Btw ${seller.vat}` : null, seller.website]
            .filter(Boolean)
            .join("  ·  ")}
        </Text>
      </View>
    </Page>
  );
}

// ── Sjabloon 2: Klassiek-zakelijk ────────────────────────────────────────────

function KlassiekPage({ data, logoSrc }: { data: OfferteDocData; logoSrc?: string | null }) {
  const seller = data.seller;
  return (
    <Page size="A4" style={kl.page}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: C.navy, paddingBottom: 10 }}>
        <View>
          {logoSrc ? (
            <Image src={logoSrc} style={{ height: 24, objectFit: "contain", marginBottom: 6 }} />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: "bold", color: C.navy }}>{seller.name}</Text>
          )}
          {seller.address ? <Text style={kl.sellerLine}>{seller.address}</Text> : null}
          <Text style={kl.sellerLine}>{seller.email}  ·  {seller.website}</Text>
          {(seller.kvk || seller.vat) ? (
            <Text style={kl.sellerLine}>
              {[seller.kvk ? `KvK ${seller.kvk}` : null, seller.vat ? `Btw ${seller.vat}` : null].filter(Boolean).join("  ·  ")}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: C.navy }}>Offerte</Text>
          <Text style={kl.metaLine}>Nummer: {data.quoteNumber}</Text>
          <Text style={kl.metaLine}>Datum: {fmtDate(data.createdAt)}</Text>
          <Text style={kl.metaLine}>Geldig tot: {fmtDate(data.validUntil)}</Text>
        </View>
      </View>

      <View style={kl.buyerBox}>
        <Text style={kl.buyerLabel}>Aan</Text>
        {data.buyer.contactName ? <Text style={kl.buyerLine}>t.a.v. {data.buyer.contactName}</Text> : null}
        <Text style={kl.buyerName}>{data.buyer.name}</Text>
        {buyerAddressLines(data.buyer).map((l, i) => (
          <Text key={i} style={kl.buyerLine}>{l}</Text>
        ))}
        {data.buyer.kvk ? <Text style={kl.buyerLine}>KvK {data.buyer.kvk}</Text> : null}
        {data.buyer.vatNumber ? <Text style={kl.buyerLine}>Btw {data.buyer.vatNumber}</Text> : null}
      </View>

      {data.introText ? <Text style={kl.intro}>{data.introText}</Text> : null}

      <LineItemsTable items={data.lineItems} accent={C.navy} zebra />
      <Totals data={data} accent={C.navy} />

      <View style={{ marginTop: 20 }}>
        <Text style={kl.sectionLabel}>Voorwaarden</Text>
        <Text style={kl.fine}>Geldig tot {fmtDate(data.validUntil)}.</Text>
        <Text style={kl.fine}>{VAT_NOTE}</Text>
        <Text style={kl.fine}>{TERMS_NOTE}</Text>
        {data.closingText ? <Text style={kl.closing}>{data.closingText}</Text> : null}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 26 }}>
        <View style={kl.signBox}>
          <Text style={kl.signLabel}>Voor akkoord, namens {data.buyer.name}</Text>
          <View style={kl.signLine} />
          <Text style={kl.signHint}>Naam, datum en handtekening</Text>
        </View>
        <View style={kl.signBox}>
          <Text style={kl.signLabel}>Namens {seller.name}</Text>
          <View style={kl.signLine} />
          <Text style={kl.signHint}>Datum en handtekening</Text>
        </View>
      </View>
    </Page>
  );
}

// ── Sjabloon 3: Merk-expressief ──────────────────────────────────────────────

function MerkPage({ data, iconSrc }: { data: OfferteDocData; iconSrc?: string | null }) {
  const seller = data.seller;
  return (
    <Page size="A4" style={mk.page}>
      {/* Navy headerbalk — mascotte-icoon + witte wordmark (navy-tekst zou wegvallen) */}
      <View style={mk.header}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {iconSrc ? (
              <Image src={iconSrc} style={{ height: 28, width: 28, marginRight: 8 }} />
            ) : null}
            <Text style={{ fontSize: 17, fontWeight: "bold", color: C.white }}>Dicteren.ai</Text>
          </View>
          <Text style={mk.headerSub}>Spraak naar tekst, lokaal op je eigen computer.</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: C.white, letterSpacing: 1 }}>OFFERTE</Text>
          <Text style={mk.headerMeta}>{data.quoteNumber}</Text>
          <Text style={mk.headerMeta}>{fmtDate(data.createdAt)}</Text>
        </View>
      </View>

      <View style={mk.body}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: "48%" }}>
            <Text style={mk.blockLabel}>Voor</Text>
            {data.buyer.contactName ? <Text style={mk.partyLine}>t.a.v. {data.buyer.contactName}</Text> : null}
            <Text style={mk.party}>{data.buyer.name}</Text>
            {buyerAddressLines(data.buyer).map((l, i) => (
              <Text key={i} style={mk.partyLine}>{l}</Text>
            ))}
            {data.buyer.kvk ? <Text style={mk.partyLine}>KvK {data.buyer.kvk}</Text> : null}
            {data.buyer.vatNumber ? <Text style={mk.partyLine}>Btw {data.buyer.vatNumber}</Text> : null}
          </View>
          <View style={{ width: "44%", backgroundColor: C.aqua50, borderRadius: 6, padding: 10 }}>
            <Text style={mk.blockLabel}>Van</Text>
            <Text style={mk.party}>{seller.name}</Text>
            {seller.address ? <Text style={mk.partyLine}>{seller.address}</Text> : null}
            {seller.kvk ? <Text style={mk.partyLine}>KvK {seller.kvk}</Text> : null}
            {seller.vat ? <Text style={mk.partyLine}>Btw {seller.vat}</Text> : null}
            <Text style={mk.partyLine}>{seller.email}</Text>
            <Text style={mk.partyLine}>Geldig tot {fmtDate(data.validUntil)}</Text>
          </View>
        </View>

        {data.introText ? <Text style={mk.intro}>{data.introText}</Text> : null}

        <LineItemsTable items={data.lineItems} accent={C.orange} />
        <Totals data={data} accent={C.orange} boxed />

        <View style={mk.akkoordBox}>
          <Text style={mk.akkoordTitle}>Akkoord?</Text>
          <Text style={mk.akkoordText}>
            Mail je bevestiging naar {seller.email}. Daarna sturen we de licentiecodes en een betaal-link.
          </Text>
        </View>

        {data.closingText ? <Text style={mk.closing}>{data.closingText}</Text> : null}
        <Text style={mk.fine}>{VAT_NOTE}</Text>
        <Text style={mk.fine}>{TERMS_NOTE}</Text>
      </View>

      <View style={mk.footer} fixed>
        <Text style={mk.footerText}>
          {[seller.name, seller.kvk ? `KvK ${seller.kvk}` : null, seller.vat ? `Btw ${seller.vat}` : null, seller.website]
            .filter(Boolean)
            .join("  ·  ")}
        </Text>
      </View>
    </Page>
  );
}

export function OfferteDocument({ data, templateKey, logoSrc, iconSrc }: OfferteDocProps) {
  return (
    <Document
      title={`Offerte ${data.quoteNumber} — ${data.buyer.name}`}
      author="Dicteren.ai"
      subject={`Offerte ${periodSuffix(data.period)}`.trim()}
    >
      {templateKey === "minimalist" ? (
        <MinimalistPage data={data} logoSrc={logoSrc} />
      ) : templateKey === "klassiek" ? (
        <KlassiekPage data={data} logoSrc={logoSrc} />
      ) : (
        <MerkPage data={data} iconSrc={iconSrc} />
      )}
    </Document>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const tbl = StyleSheet.create({
  head: { fontSize: 8, color: C.textMuted, fontWeight: "bold", textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    alignItems: "center",
  },
  cellDesc: { width: "52%", fontSize: 9.5, color: C.text, paddingRight: 6 },
  cellQty: { width: "12%", fontSize: 9.5, color: C.text, textAlign: "right" },
  cellUnit: { width: "18%", fontSize: 9.5, color: C.text, textAlign: "right" },
  cellTotal: { width: "18%", fontSize: 9.5, color: C.text, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { fontSize: 9.5, color: C.textMuted },
  totalVal: { fontSize: 9.5, color: C.text },
  grandVal: { fontSize: 13, fontWeight: "bold" },
});

const min = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 44, paddingBottom: 56, fontFamily: "Lato", color: C.text },
  metaLine: { fontSize: 9.5, color: C.textMuted, marginTop: 2 },
  blockLabel: { fontSize: 8, color: C.textMuted, fontWeight: "bold", textTransform: "uppercase", marginBottom: 3 },
  party: { fontSize: 11, fontWeight: "bold", color: C.navy },
  partyLine: { fontSize: 9.5, color: C.textMuted, marginTop: 1.5 },
  intro: { fontSize: 10, color: C.text, marginTop: 18, lineHeight: 1.5 },
  validity: { fontSize: 10, fontWeight: "bold", color: C.navy },
  closing: { fontSize: 10, color: C.text, marginTop: 6, lineHeight: 1.5 },
  akkoord: { fontSize: 10, color: C.text, marginTop: 6 },
  fine: { fontSize: 8, color: C.textMuted, marginTop: 6, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 26, left: 44, right: 44, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 6 },
  footerText: { fontSize: 8, color: C.textMuted, textAlign: "center" },
});

const kl = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 44, paddingBottom: 48, fontFamily: "Lato", color: C.text },
  sellerLine: { fontSize: 8.5, color: C.textMuted, marginTop: 1.5 },
  metaLine: { fontSize: 9.5, color: C.text, marginTop: 2 },
  buyerBox: { marginTop: 18, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, width: "60%" },
  buyerLabel: { fontSize: 8, color: C.textMuted, fontWeight: "bold", textTransform: "uppercase", marginBottom: 3 },
  buyerName: { fontSize: 11, fontWeight: "bold", color: C.navy },
  buyerLine: { fontSize: 9.5, color: C.textMuted, marginTop: 1.5 },
  intro: { fontSize: 10, color: C.text, marginTop: 16, lineHeight: 1.5 },
  sectionLabel: { fontSize: 8, color: C.textMuted, fontWeight: "bold", textTransform: "uppercase", marginBottom: 4 },
  fine: { fontSize: 8.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 },
  closing: { fontSize: 10, color: C.text, marginTop: 8, lineHeight: 1.5 },
  signBox: { width: "46%" },
  signLabel: { fontSize: 9, color: C.textMuted },
  signLine: { borderBottomWidth: 1, borderBottomColor: C.navy, marginTop: 30 },
  signHint: { fontSize: 8, color: C.textMuted, marginTop: 4 },
});

const mk = StyleSheet.create({
  page: { fontFamily: "Lato", color: C.text, paddingBottom: 48 },
  header: {
    backgroundColor: C.navy,
    paddingTop: 30,
    paddingBottom: 22,
    paddingHorizontal: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerSub: { fontSize: 9, color: C.aqua, marginTop: 6 },
  headerMeta: { fontSize: 9.5, color: C.white, marginTop: 2, opacity: 0.85 },
  body: { paddingHorizontal: 44, paddingTop: 22 },
  blockLabel: { fontSize: 8, color: C.textMuted, fontWeight: "bold", textTransform: "uppercase", marginBottom: 3 },
  party: { fontSize: 11, fontWeight: "bold", color: C.navy },
  partyLine: { fontSize: 9.5, color: C.textMuted, marginTop: 1.5 },
  intro: { fontSize: 10, color: C.text, marginTop: 18, lineHeight: 1.5 },
  akkoordBox: { backgroundColor: C.aqua50, borderRadius: 6, padding: 12, marginTop: 18 },
  akkoordTitle: { fontSize: 11, fontWeight: "bold", color: C.navy },
  akkoordText: { fontSize: 9.5, color: C.text, marginTop: 3, lineHeight: 1.5 },
  closing: { fontSize: 10, color: C.text, marginTop: 12, lineHeight: 1.5 },
  fine: { fontSize: 8, color: C.textMuted, marginTop: 6, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 6 },
  footerText: { fontSize: 8, color: C.textMuted, textAlign: "center" },
});
