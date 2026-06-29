import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-forwarded-for",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Hosts the proxy is allowed to forward requests to.
// Add new providers here when needed; everything else is rejected.
const ALLOWED_HOST_SUFFIXES = [
  "streamed.pk", "streamed.su", "ppv.to", "ppv.land", "sportsbite.app",
  "lacancha.tv", "fubohd.com", "cdn-fubohd.com", "topembed.pw",
  "embedme.top", "embedstream.me", "1stream.top", "wikisport.best",
  "sportshub.stream", "weakstreams.com",
  // Common HLS/CDN hosts used by the providers above:
  "akamaized.net", "cloudfront.net", "fastly.net", "edgesuite.net",
  "googlevideo.com", "ttvnw.net", "twitch.tv",
];

function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => h === suffix || h.endsWith("." + suffix),
  );
}

// Block private / loopback / link-local / metadata ranges to prevent SSRF.
function isPrivateIp(host: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map((n) => parseInt(n, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  // Plain IPv6 literal — block anything not a clearly public address
  if (host.includes(":")) return true;
  // Special hostnames
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) return true;
  return false;
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function validateTarget(rawUrl: string): { ok: true; url: URL } | { ok: false; status: number; msg: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, status: 400, msg: "URL inválida" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, status: 400, msg: "Sólo http(s) permitido" };
  }
  if (isPrivateIp(parsed.hostname)) {
    return { ok: false, status: 403, msg: "Destino no permitido" };
  }
  if (!isAllowedHost(parsed.hostname)) {
    return { ok: false, status: 403, msg: "Host no permitido" };
  }
  return { ok: true, url: parsed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const streamUrl = url.searchParams.get("url");
    if (!streamUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decodedUrl = decodeURIComponent(streamUrl);
    const check = validateTarget(decodedUrl);
    if (!check.ok) {
      return new Response(JSON.stringify({ error: check.msg }), {
        status: check.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsedUrl = check.url;

    const userAgent = getRandomUserAgent();
    const fetchHeaders: Record<string, string> = {
      "User-Agent": userAgent,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": parsedUrl.origin + "/",
      "Origin": parsedUrl.origin,
      "Connection": "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };

    // Don't follow redirects automatically — we have to revalidate the target.
    const response = await fetch(decodedUrl, { headers: fetchHeaders, redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("Location");
      if (!loc) {
        return new Response(JSON.stringify({ error: "Redirect without Location" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const absolute = new URL(loc, decodedUrl).toString();
      const recheck = validateTarget(absolute);
      if (!recheck.ok) {
        return new Response(JSON.stringify({ error: "Redirect bloqueado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Re-issue request to the validated target
      const retryResponse = await fetch(absolute, { headers: fetchHeaders });
      const retryContentType = retryResponse.headers.get("Content-Type") || "application/vnd.apple.mpegurl";
      const retryBody = await retryResponse.text();
      return processM3U8Response(retryBody, absolute, url, retryContentType, corsHeaders);
    }

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `Stream fetch failed: ${response.status}`,
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = response.headers.get("Content-Type") || "application/vnd.apple.mpegurl";
    const body = await response.text();
    return processM3U8Response(body, decodedUrl, url, contentType, corsHeaders);
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processM3U8Response(
  body: string,
  decodedUrl: string,
  proxyUrl: URL,
  contentType: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (decodedUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")) {
    const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);
    const proxyBase = `${proxyUrl.origin}/stream-proxy?url=`;

    const rewrittenBody = body.split("\n").map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") {
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/, (_m, uri) => {
            if (uri.startsWith("http")) return `URI="${proxyBase}${encodeURIComponent(uri)}"`;
            return `URI="${proxyBase}${encodeURIComponent(baseUrl + uri)}"`;
          });
        }
        return line;
      }
      if (trimmed.startsWith("http")) {
        return `${proxyBase}${encodeURIComponent(trimmed)}`;
      } else if (
        trimmed.endsWith(".ts") || trimmed.endsWith(".m3u8") ||
        trimmed.includes(".ts?") || trimmed.includes(".m3u8?") ||
        trimmed.includes(".aac")
      ) {
        return `${proxyBase}${encodeURIComponent(baseUrl + trimmed)}`;
      }
      return line;
    }).join("\n");

    return new Response(rewrittenBody, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Binary segment: revalidate (we already validated decodedUrl above)
  const userAgent = getRandomUserAgent();
  const binaryResponse = await fetch(decodedUrl, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "*/*",
      "Referer": new URL(decodedUrl).origin + "/",
    },
  });

  const arrayBuffer = await binaryResponse.arrayBuffer();
  return new Response(arrayBuffer, {
    headers: {
      ...corsHeaders,
      "Content-Type": contentType.includes("mpegurl") ? "application/vnd.apple.mpegurl" : "video/mp2t",
      "Cache-Control": "max-age=3600",
    },
  });
}
