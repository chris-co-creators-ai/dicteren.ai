// Dicteren.ai — Offerte-PDF (react-pdf, server-side render)
//
// Eén sjabloon (Merk) op datamodel OfferteDocData, met de wettelijke
// NL-offerte-onderdelen: afzender (naam/adres/KvK/BTW), klant t.a.v., uniek
// offertenummer + datum + geldig tot, prijstabel, subtotaal excl. btw, 21% btw,
// totaal incl., akkoord-blok en verwijzing naar de algemene voorwaarden.
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
  /** Mascotte-icoon — leesbaar op de navy merk-balk. */
  iconSrc?: string | null;
};

function fmtDate(value: string | Date | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
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

// ── Gedeelde regel-tabel + totalen ───────────────────────────────────────────

function LineItemsTable({ items, accent }: { items: OfferteLineItem[]; accent: string }) {
  return (
    <View style={{ marginTop: 6 }}>
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
        <View key={i} style={tbl.row}>
          <Text style={tbl.cellDesc}>{it.description}</Text>
          <Text style={tbl.cellQty}>{it.qty}</Text>
          <Text style={tbl.cellUnit}>{euroCents(it.unitNetCents)}</Text>
          <Text style={tbl.cellTotal}>{euroCents(it.netCents)}</Text>
        </View>
      ))}
    </View>
  );
}

function Totals({ data, accent }: { data: OfferteDocData; accent: string }) {
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
              paddingBottom: 6,
              paddingHorizontal: 8,
              backgroundColor: accent,
              borderRadius: 4,
            },
          ]}
        >
          <Text style={[tbl.totalLabel, { fontWeight: "bold", color: C.white }]}>
            Totaal incl. btw
          </Text>
          <Text style={[tbl.grandVal, { color: C.white }]}>
            {euroCents(data.grossCents)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Sjabloon: Merk-expressief ────────────────────────────────────────────────

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
        <Totals data={data} accent={C.orange} />

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

export function OfferteDocument({ data, iconSrc }: OfferteDocProps) {
  return (
    <Document
      title={`Offerte ${data.quoteNumber} voor ${data.buyer.name}`}
      author="Dicteren.ai"
      subject={`Offerte ${periodSuffix(data.period)}`.trim()}
    >
      <MerkPage data={data} iconSrc={iconSrc} />
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
