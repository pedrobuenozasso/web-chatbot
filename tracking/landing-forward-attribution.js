/**
 * Use this helper on the Zasso landing page, in the action that opens the
 * chatbot. It forwards only marketing attribution, never form fields or PII.
 */
const CHATBOT_ORIGIN = "https://web-chatbot-rouge.vercel.app/";
const ALLOWED_QUERY_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_id",
  "meta_campaign_id",
  "adset_id",
  "meta_adset_id",
  "ad_id",
  "meta_ad_id",
  "fbclid",
];

export function chatbotUrlWithAttribution(currentUrl = window.location.href) {
  const source = new URL(currentUrl);
  const chatbot = new URL(CHATBOT_ORIGIN);
  for (const parameter of ALLOWED_QUERY_PARAMETERS) {
    const value = source.searchParams.get(parameter);
    if (value) chatbot.searchParams.set(parameter, value);
  }
  chatbot.searchParams.set("landing_path", source.pathname);
  return chatbot.toString();
}
