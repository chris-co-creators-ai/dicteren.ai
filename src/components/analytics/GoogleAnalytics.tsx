// Dicteren.ai — Google tag (GA4 + Google Ads) + Consent Mode v2
//
// Twee componenten:
//   - ConsentModeBootstrap: zet default-denied state vóór ELKE script-load.
//     MOET in <head> staan zodat het uitgevoerd wordt voordat gtag.js
//     consent-checks doet. EU-conform.
//   - GoogleAnalytics: laadt gtag.js en configt wat er in env staat — GA4
//     (NEXT_PUBLIC_GA_ID) en/of Google Ads (NEXT_PUBLIC_GOOGLE_ADS_ID, voor
//     conversie-meting op /admin/inbound-campagnes). Zonder env-vars: no-op.
//
// Werkt samen met lib/consent/ConsentProvider — bij user-consent-update
// roept die `gtag('consent', 'update', …)` aan. Conversies vuren via
// components/analytics/ConversionPing + lib/tracking/googleAds.ts.

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/** Inline-script dat dataLayer + gtag stub + default-denied consent zet.
 *  Plaats in <head>. */
export function ConsentModeBootstrap() {
  return (
    <Script
      id="consent-mode-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
        `.trim(),
      }}
    />
  );
}

/** Google-tag-loader (GA4 + Ads). Alleen actief als er minstens één id is. */
export function GoogleAnalytics() {
  const primaryId = GA_ID ?? ADS_ID;
  if (!primaryId) return null;
  const configs = [
    GA_ID &&
      `gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: true });`,
    ADS_ID && `gtag('config', '${ADS_ID}');`,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-tag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
gtag('js', new Date());
${configs}
          `.trim(),
        }}
      />
    </>
  );
}
