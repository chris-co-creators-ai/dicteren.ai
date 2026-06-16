// Render 3 voorbeeld-offertes (één offerte, drie sjablonen) naar ~/Downloads,
// zodat Christian het sjabloon kan kiezen. Voorbeelddata — geen echte klant,
// geen echte KvK. Draaien: `bun scripts/render-offerte-samples.tsx` vanuit web/.

import { renderToFile } from "@react-pdf/renderer";
import { createElement } from "react";
import { readFileSync } from "fs";
import path from "path";
import os from "os";
import {
  OfferteDocument,
  registerOfferteFonts,
} from "../src/components/offerte/OfferteDocument";
import {
  computeOfferteTotals,
  type OfferteDocData,
  type OfferteLineItem,
} from "../src/lib/services/offerteShared";

function dataUri(p: string): string {
  return `data:image/png;base64,${readFileSync(p).toString("base64")}`;
}

const root = process.cwd();
const logo = dataUri(path.join(root, "public/branding/logo-horizontal.png"));
const icon = dataUri(path.join(root, "public/branding/logo-icon-sm.png"));

registerOfferteFonts(
  path.join(root, "public/fonts/Lato-Regular.ttf"),
  path.join(root, "public/fonts/Lato-Bold.ttf"),
);

// 12 seats/jaar valt in staffel 10-24 = €102/seat/jaar (10200 cent) + onboarding.
const lineItems: OfferteLineItem[] = [
  { description: "Dicteren.ai zakelijk: 12 gebruikers, per jaar", qty: 12, unitNetCents: 10200, netCents: 122400 },
  { description: "Onboarding op locatie (eenmalig)", qty: 1, unitNetCents: 15000, netCents: 15000 },
];
const totals = computeOfferteTotals(lineItems);

const base: OfferteDocData = {
  quoteNumber: "OFF-2026-0001",
  status: "concept",
  createdAt: "2026-06-16T10:00:00.000Z",
  validUntil: "2026-07-16",
  period: "yearly",
  introText:
    "Bedankt voor je interesse in Dicteren.ai. Hieronder staat je offerte op maat.",
  closingText: "Vragen over deze offerte? Mail naar info@dicteren.ai.",
  notes: null,
  lineItems,
  netCents: totals.netCents,
  vatCents: totals.vatCents,
  grossCents: totals.grossCents,
  seller: {
    name: "Dicteren.ai",
    email: "info@dicteren.ai",
    website: "dicteren.ai",
    kvk: "12345678",
    vat: "NL001234567B01",
    address: "Voorbeeldstraat 1, 1011 AB Amsterdam",
  },
  buyer: {
    name: "Van den Berg Advocaten B.V.",
    kvk: "87654321",
    vatNumber: "NL008765432B01",
    addressLine1: "Keizersgracht 100",
    addressLine2: null,
    postalCode: "1015 CV",
    city: "Amsterdam",
    contactName: "mr. Sanne van den Berg",
    contactEmail: "s.vandenberg@voorbeeld.nl",
  },
};

const out = path.join(os.homedir(), "Downloads");
const variants = [
  ["merk", "Merk"],
  ["minimalist", "Strak"],
  ["klassiek", "Klassiek"],
] as const;

console.log(
  `Totalen: net ${totals.netCents}  btw ${totals.vatCents}  bruto ${totals.grossCents}`,
);

for (const [key, label] of variants) {
  const file = path.join(out, `offerte-voorbeeld-${label}.pdf`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await renderToFile(
    createElement(OfferteDocument, {
      data: base,
      templateKey: key,
      logoSrc: logo,
      iconSrc: icon,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
    file,
  );
  console.log("wrote", file);
}
