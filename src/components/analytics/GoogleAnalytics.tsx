// Dicteren.ai — Google Analytics 4 + Consent Mode v2
//
// Twee componenten:
//   - ConsentModeBootstrap: zet default-denied state vóór ELKE script-load.
//     MOET in <head> staan zodat het uitgevoerd wordt voordat gtag.js
//     consent-checks doet. EU-conform.
//   - GoogleAnalytics: laadt gtag.js + initialiseert GA4 met measurement-id.
//     Alleen actief als NEXT_PUBLIC_GA_ID env-var aanwezig is. Beide kunnen
//     veilig in productie zonder GA-id staan (no-op).
//
// Werkt samen met lib/consent/ConsentProvider — bij user-consent-update
// roept die `gtag('consent', 'update', …)` aan.

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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

/** GA4 tag-loader. Alleen actief als measurement-id geconfigureerd is. */
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
gtag('js', new Date());
gtag('config', '${GA_ID}', {
  anonymize_ip: true,
  send_page_view: true
});
          `.trim(),
        }}
      />
    </>
  );
}
