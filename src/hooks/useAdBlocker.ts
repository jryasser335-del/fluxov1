import { useEffect, useCallback } from "react";

// Common ad-related selectors that appear in streaming embeds
const AD_SELECTORS = [
  // Common ad containers
  '[id*="ad"]',
  '[class*="ad-"]',
  '[class*="ads-"]',
  '[class*="advertisement"]',
  '[id*="banner"]',
  '[class*="banner"]',
  '[class*="popup"]',
  '[class*="modal-ad"]',
  '[class*="overlay-ad"]',
  '[class*="preroll"]',
  '[class*="midroll"]',
  '[class*="postroll"]',
  '[class*="sponsor"]',
  // Specific streaming ad patterns
  '[class*="vast-"]',
  '[class*="vpaid"]',
  '[class*="ima-"]',
  '[id*="google_ads"]',
  '[class*="ad-container"]',
  '[class*="video-ad"]',
  '[class*="player-ad"]',
];

// URL patterns commonly associated with ads
const AD_URL_PATTERNS = [
  /doubleclick\.net/i,
  /googlesyndication\.com/i,
  /googleadservices\.com/i,
  /adservice\.google/i,
  /ads\.yahoo/i,
  /facebook\.com\/tr/i,
  /analytics\.google/i,
  /hotjar\.com/i,
  /scorecardresearch/i,
  /quantserve/i,
  /outbrain/i,
  /taboola/i,
  /criteo/i,
  /pubmatic/i,
  /rubiconproject/i,
  /openx\.net/i,
  /adnxs\.com/i,
  /advertising/i,
];

// DNS servers known for blocking ads
export const AD_BLOCKING_DNS = [
  {
    name: "AdGuard DNS",
    primary: "94.140.14.14",
    secondary: "94.140.15.15",
    description: "Bloquea anuncios y trackers automáticamente",
    url: "https://adguard-dns.io",
  },
  {
    name: "NextDNS",
    primary: "45.90.28.0",
    secondary: "45.90.30.0",
    description: "DNS personalizable con protección avanzada",
    url: "https://nextdns.io",
  },
  {
    name: "Pi-hole",
    primary: "Configurable",
    secondary: "-",
    description: "Bloqueador de anuncios a nivel de red",
    url: "https://pi-hole.net",
  },
  {
    name: "Cloudflare (Malware)",
    primary: "1.1.1.2",
    secondary: "1.0.0.2",
    description: "Bloquea malware y contenido malicioso",
    url: "https://cloudflare.com",
  },
];

export interface AdBlockerOptions {
  enabled?: boolean;
  aggressiveMode?: boolean;
}

export function useAdBlocker(options: AdBlockerOptions = {}) {
  const { enabled = true, aggressiveMode = false } = options;

  // Inject ad-blocking CSS into the document
  const injectAdBlockCSS = useCallback(() => {
    if (!enabled) return;

    const styleId = "fluxo-adblock-styles";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    // Generate CSS rules to hide ad elements
    const cssRules = AD_SELECTORS.map(
      (selector) => `${selector} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; width: 0 !important; position: absolute !important; left: -9999px !important; }`
    ).join("\n");

    // Additional aggressive rules
    const aggressiveRules = aggressiveMode
      ? `
      iframe[src*="ad"] { display: none !important; }
      iframe[src*="banner"] { display: none !important; }
      div[data-ad] { display: none !important; }
      .ad-wrapper, .ad-slot, .ad-unit { display: none !important; }
      [data-google-query-id] { display: none !important; }
    `
      : "";

    styleEl.textContent = cssRules + aggressiveRules;
  }, [enabled, aggressiveMode]);

  // Clean ad-related parameters from URLs
  const cleanAdParams = useCallback((url: string): string => {
    try {
      const urlObj = new URL(url);
      const adParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "fbclid",
        "gclid",
        "msclkid",
        "ref",
        "affiliate",
      ];

      adParams.forEach((param) => {
        urlObj.searchParams.delete(param);
      });

      // Add anti-ad parameters
      urlObj.searchParams.set("ads", "0");
      urlObj.searchParams.set("ad", "0");
      urlObj.searchParams.set("noads", "1");
      urlObj.searchParams.set("disable_ads", "1");

      return urlObj.toString();
    } catch {
      return url;
    }
  }, []);

  // Check if URL is an ad
  const isAdUrl = useCallback((url: string): boolean => {
    return AD_URL_PATTERNS.some((pattern) => pattern.test(url));
  }, []);

  // Block known ad requests (for use with fetch/XHR interception)
  const shouldBlockRequest = useCallback(
    (url: string): boolean => {
      if (!enabled) return false;
      return isAdUrl(url);
    },
    [enabled, isAdUrl]
  );

  // Apply ad blocking on mount
  useEffect(() => {
    if (!enabled) return;

    injectAdBlockCSS();

    // Create a MutationObserver to handle dynamically added ad elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if the added element matches ad selectors
            AD_SELECTORS.forEach((selector) => {
              if (node.matches(selector) || node.querySelector(selector)) {
                node.style.display = "none";
                node.style.visibility = "hidden";
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, injectAdBlockCSS]);

  return {
    cleanAdParams,
    isAdUrl,
    shouldBlockRequest,
    injectAdBlockCSS,
    dnsServers: AD_BLOCKING_DNS,
  };
}
