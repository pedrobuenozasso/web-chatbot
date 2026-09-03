type MetaPixelEvent = "Contact" | "Lead" | "Schedule";
type MetaPixelParameters = Record<string, string>;

declare global {
  interface Window {
    fbq?: (...arguments_: unknown[]) => void;
  }
}

export function trackMetaPixelEvent(eventName: MetaPixelEvent, parameters: MetaPixelParameters) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, parameters);
}
