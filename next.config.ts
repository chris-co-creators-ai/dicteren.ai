import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // De partner-deck-pagina's zijn werving per niet-raadbare token. Nooit
        // indexeren: harde X-Robots-Tag-header (geldt ook als de meta-robots niet
        // gelezen wordt), bovenop de noindex in de page-metadata.
        source: "/partner/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
