export type CampaignAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  fbclid?: string;
  landingPath?: string;
  referrerHost?: string;
};

// Alguns navegadores internos da Meta preservam uma camada extra de URL
// encoding no valor já lido pelo URLSearchParams (ex.: %5BCB%5D+...).
// Decodificamos no máximo duas camadas adicionais para recuperar UTMs sem
// transformar uma entrada malformada em falha no chat.
function decodeTrackingValue(value: string) {
  let decoded = value.trim();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const candidate = decoded.replaceAll("+", " ");
    if (!/[+]|%[0-9a-f]{2}/i.test(candidate)) break;
    try {
      const next = decodeURIComponent(candidate);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded.trim();
}

function readParam(parameters: URLSearchParams, name: string) {
  const rawValue = parameters.get(name);
  const value = rawValue ? decodeTrackingValue(rawValue) : "";
  return value || undefined;
}

export function campaignAttributionFromBrowser(location: Location, referrer: string): CampaignAttribution | undefined {
  const parameters = new URLSearchParams(location.search);
  let referrerHost: string | undefined;
  try { referrerHost = referrer ? new URL(referrer).hostname : undefined; } catch { /* Referrer is optional. */ }
  const attribution: CampaignAttribution = {
    utmSource: readParam(parameters, "utm_source"),
    utmMedium: readParam(parameters, "utm_medium"),
    utmCampaign: readParam(parameters, "utm_campaign"),
    utmContent: readParam(parameters, "utm_content"),
    utmTerm: readParam(parameters, "utm_term"),
    campaignId: readParam(parameters, "campaign_id") || readParam(parameters, "meta_campaign_id"),
    adsetId: readParam(parameters, "adset_id") || readParam(parameters, "meta_adset_id"),
    adId: readParam(parameters, "ad_id") || readParam(parameters, "meta_ad_id"),
    fbclid: readParam(parameters, "fbclid"),
    landingPath: readParam(parameters, "landing_path") || location.pathname,
    referrerHost,
  };
  return Object.values(attribution).some(Boolean) ? attribution : undefined;
}
