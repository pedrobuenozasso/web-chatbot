// Public measurement ID of the existing Zasso Group property, confirmed in Ads.
// An explicitly empty environment value disables the Google integration.
export const GOOGLE_ANALYTICS_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "G-2PEL52X12S";

type GoogleTag = (...parameters: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
    zassoGoogleAnalyticsConfigured?: boolean;
  }
}

const campaignParameters = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "gclid", "gbraid", "wbraid",
];

export function googlePageLocation(href: string) {
  const source = new URL(href);
  const target = new URL(source.origin + source.pathname);
  for (const name of campaignParameters) {
    const value = source.searchParams.get(name);
    if (value) target.searchParams.set(name, value);
  }
  return target.toString();
}

export function initializeGoogleAnalytics() {
  if (typeof window === "undefined" || !/^G-[A-Z0-9]+$/.test(GOOGLE_ANALYTICS_ID)) return false;
  if (window.zassoGoogleAnalyticsConfigured) return true;

  window.dataLayer ??= [];
  // Keep Google's documented arguments-based dataLayer command queue.
  // eslint-disable-next-line prefer-rest-params
  window.gtag ??= function () { window.dataLayer?.push(arguments); };
  const referrer = typeof document === "undefined" ? "" : document.referrer;
  let referrerOrigin = "";
  try { referrerOrigin = referrer ? new URL(referrer).origin : ""; } catch { /* Optional referrer. */ }

  try {
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_ID, {
      page_location: googlePageLocation(window.location.href),
      page_referrer: referrerOrigin,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  } catch { return false; }
  window.zassoGoogleAnalyticsConfigured = true;
  return true;
}

const languages = new Set(["pt-BR", "pt-PT", "en", "de", "fr", "es", "it"]);

// This tracker belongs to one chat instance. Showing the handoff or starting the
// chat never calls it; repeated clicks on the final CTA count only once.
export function createWhatsAppClickTracker() {
  let tracked = false;
  return ({ segment, language }: { segment: string; language: string }) => {
    if (tracked || !initializeGoogleAnalytics()) return;
    try {
      window.gtag?.("event", "whatsapp_click", {
        send_to: GOOGLE_ANALYTICS_ID,
        segment: segment === "agro" || segment === "urban" ? segment : "unknown",
        ui_language: languages.has(language) ? language : "pt-BR",
        transport_type: "beacon",
      });
      tracked = true;
    } catch { /* Measurement must never prevent opening WhatsApp. */ }
  };
}
