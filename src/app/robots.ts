import type { MetadataRoute } from "next";

// /robots.txt — de publieke marketing-site is volledig crawlbaar. De private en
// niet-publieke routes blijven uit de zoekmachines. De partner-deck-pagina's
// (/partner/[token]) zijn werving per token en hebben bovendien een noindex-header
// (zie next.config.ts). De affiliate-landingpagina's (/[slug]) en /word-partner
// blijven juist wél indexeerbaar (backlink-waarde), dus die staan hier niet bij.
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
