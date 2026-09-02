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

function readParam(parameters: URLSearchParams, name: string) {
  const value = parameters.get(name)?.trim();
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
