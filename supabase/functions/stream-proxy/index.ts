import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

    // Fetch the stream content
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(decodedUrl).origin + "/",
        "Origin": new URL(decodedUrl).origin,
      },
    });

    if (!response.ok) {
      console.error("Stream fetch failed:", response.status, response.statusText);
      return new Response(JSON.stringify({ error: `Stream fetch failed: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = response.headers.get("Content-Type") || "application/vnd.apple.mpegurl";
    let body = await response.text();

    // If it's an m3u8 manifest, rewrite segment URLs to go through our proxy
    if (decodedUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")) {
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);
      const proxyBase = `${url.origin}/stream-proxy?url=`;

      // Rewrite relative URLs to absolute proxied URLs
      body = body.split("\n").map((line) => {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith("#") || trimmed === "") {
          // But check for URI= in EXT-X-KEY or similar
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
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
        } else if (trimmed.endsWith(".ts") || trimmed.endsWith(".m3u8") || trimmed.includes(".ts?") || trimmed.includes(".m3u8?")) {
          return `${proxyBase}${encodeURIComponent(baseUrl + trimmed)}`;
        }
        
        return line;
      }).join("\n");

      return new Response(body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For .ts segments, return as binary
    const binaryResponse = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
  } catch (error) {
    console.error("Proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
