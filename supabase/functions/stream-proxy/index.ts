import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Random user agents to rotate and avoid detection
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

serve(async (req) => {
  // Handle CORS preflight
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

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(streamUrl);
    
    console.log("Proxying stream:", decodedUrl);

    const userAgent = getRandomUserAgent();
    const parsedUrl = new URL(decodedUrl);

    // Build headers that work for international users
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

    // Fetch the stream content
    const response = await fetch(decodedUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok) {
      console.error("Stream fetch failed:", response.status, response.statusText);
      
      // Try again with minimal headers for some servers
      const retryResponse = await fetch(decodedUrl, {
        headers: {
          "User-Agent": userAgent,
          "Accept": "*/*",
        },
      });
      
      if (!retryResponse.ok) {
        return new Response(JSON.stringify({ 
          error: `Stream fetch failed: ${response.status}`,
          details: "El servidor del stream rechazó la conexión"
        }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Process retry response
      const retryContentType = retryResponse.headers.get("Content-Type") || "application/vnd.apple.mpegurl";
      const retryBody = await retryResponse.text();
      return processM3U8Response(retryBody, decodedUrl, url, retryContentType, corsHeaders);
    }

    const contentType = response.headers.get("Content-Type") || "application/vnd.apple.mpegurl";
    const body = await response.text();

    return processM3U8Response(body, decodedUrl, url, contentType, corsHeaders);

  } catch (error) {
    console.error("Proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: message,
      hint: "Si estás fuera de USA, algunos streams pueden estar geo-bloqueados"
    }), {
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
  corsHeaders: Record<string, string>
): Promise<Response> {
  // If it's an m3u8 manifest, rewrite segment URLs to go through our proxy
  if (decodedUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")) {
    const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);
    const proxyBase = `${proxyUrl.origin}/stream-proxy?url=`;

    // Rewrite relative URLs to absolute proxied URLs
    const rewrittenBody = body.split("\n").map((line) => {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith("#") || trimmed === "") {
        // But check for URI= in EXT-X-KEY or similar
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/, (_match, uri) => {
            if (uri.startsWith("http")) {
              return `URI="${proxyBase}${encodeURIComponent(uri)}"`;
            }
            return `URI="${proxyBase}${encodeURIComponent(baseUrl + uri)}"`;
          });
        }
        return line;
      }
      
      // Handle segment URLs
      if (trimmed.startsWith("http")) {
        return `${proxyBase}${encodeURIComponent(trimmed)}`;
      } else if (trimmed.endsWith(".ts") || trimmed.endsWith(".m3u8") || trimmed.includes(".ts?") || trimmed.includes(".m3u8?") || trimmed.includes(".aac")) {
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

  // For .ts segments, fetch and return as binary
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