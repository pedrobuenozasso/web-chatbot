"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GOOGLE_ANALYTICS_ID, initializeGoogleAnalytics } from "../lib/google-analytics";

export function GoogleAnalytics() {
  useEffect(() => { initializeGoogleAnalytics(); }, []);

  if (!/^G-[A-Z0-9]+$/.test(GOOGLE_ANALYTICS_ID)) return null;
  return (
    <Script
      id="zasso-google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
      strategy="afterInteractive"
    />
  );
}
