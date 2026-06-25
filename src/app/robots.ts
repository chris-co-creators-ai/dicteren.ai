import type { MetadataRoute } from "next";

// /robots.txt — de publieke marketing-site is crawlbaar. De private en
// niet-publieke routes blijven uit de zoekmachines. De partner-deck-pagina's
// (/partner/[token]) zijn werving per token en hebben bovendien een noindex-header
// (zie next.config.ts). De affiliate-landingpagina's (/[slug]) worden óók niet
// geïndexeerd, maar via noindex in hun page-metadata (de slugs zijn dynamisch en
// kunnen hier niet worden opgesomd zonder de hele root te blokkeren). Alleen
// /word-partner blijft indexeerbaar als publieke wervings-pagina.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/partner/",
        "/api/",
        "/admin/",
        "/auth/",
        "/account/",
        "/checkout/",
      ],
    },
  };
}
