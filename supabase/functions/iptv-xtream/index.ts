import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

const HOST = "http://xcodes.aftertv.xyz:8080";
const USER = "Miguel2000";
const PASS = "Miguel2000";
const UA = "VLC/3.0.18 LibVLC/3.0.18";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 10 * 60 * 1000;

function isSafeRelayTarget(raw: string) {
  try {
    const target = new URL(raw);
    if (!["http:", "https:"].includes(target.protocol)) return false;
    if (target.hostname === "localhost" || target.hostname === "127.0.0.1" || target.hostname === "0.0.0.0") return false;
    if (target.hostname.startsWith("10.") || target.hostname.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(target.hostname)) return false;
    return target.pathname.includes(`/${USER}/${PASS}/`) || target.hostname === new URL(HOST).hostname;
  } catch {
    return false;
  }
}

async function relayStream(targetUrl: string, req: Request, currentUrl: URL) {
  if (!isSafeRelayTarget(targetUrl)) return new Response("blocked", { status: 403, headers: corsHeaders });

  const target = new URL(targetUrl);
  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,*/*",
    Referer: `${target.protocol}//${target.host}/`,
    Origin: `${target.protocol}//${target.host}`,
  };
  if (range) headers.Range = range;

  const upstream = await fetch(targetUrl, { headers, redirect: "follow" });
  const finalUrl = upstream.url || targetUrl;
  const contentType = upstream.headers.get("content-type") || "";

  if (finalUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")) {
    const body = await upstream.text();
    const finalParsed = new URL(finalUrl);
    const base = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
    const origin = `${finalParsed.protocol}//${finalParsed.host}`;
    const proxyBase = `${currentUrl.origin}/functions/v1/iptv-xtream?op=relay&target=`;
    const resolve = (t: string) => {
      if (/^https?:\/\//i.test(t)) return t;
      if (t.startsWith("//")) return `${finalParsed.protocol}${t}`;
      if (t.startsWith("/")) return `${origin}${t}`;
      return base + t;
    };

    const rewritten = body.split("\n").map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) {
        if (t.includes('URI="')) {
          return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${proxyBase}${encodeURIComponent(resolve(u))}"`);
        }
        return line;
      }
      return `${proxyBase}${encodeURIComponent(resolve(t))}`;
    }).join("\n");

    return new Response(rewritten, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
    });
  }

  const respHeaders: Record<string, string> = { ...corsHeaders };
  const ct = upstream.headers.get("content-type") || (finalUrl.includes(".ts") ? "video/mp2t" : "application/octet-stream");
  const cl = upstream.headers.get("content-length");
  const cr = upstream.headers.get("content-range");
  if (ct) respHeaders["Content-Type"] = ct;
  if (cl) respHeaders["Content-Length"] = cl;
  if (cr) respHeaders["Content-Range"] = cr;
  respHeaders["Accept-Ranges"] = upstream.headers.get("accept-ranges") || "bytes";
  respHeaders["Cache-Control"] = finalUrl.includes(".ts") ? "public, max-age=8" : "no-store";
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

async function xtream(action: string, extra: Record<string, string> = {}) {
  const key = action + JSON.stringify(extra);
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data;
  const params = new URLSearchParams({ username: USER, password: PASS, action, ...extra });
  const r = await fetch(`${HOST}/player_api.php?${params}`, { headers: { "User-Agent": UA } });
  const data = await r.json();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op") || "live_categories";

    if (op === "relay") {
      const target = url.searchParams.get("target");
      if (!target) return new Response("missing target", { status: 400, headers: corsHeaders });
      return relayStream(target, req, url);
    }

    // ── Stream proxy (live HLS, vod MP4, series MP4) ──
    if (op === "stream") {
      const kind = url.searchParams.get("kind") || "live"; // live | movie | series
      const id = url.searchParams.get("id");
      const ext = url.searchParams.get("ext") || (kind === "live" ? "m3u8" : "mp4");
      if (!id) return new Response("missing id", { status: 400, headers: corsHeaders });

      const primaryExt = kind === "live" && ext !== "ts" ? "m3u8" : ext;
      const segUrl = `${HOST}/${kind}/${USER}/${PASS}/${id}.${primaryExt}`;
      const range = req.headers.get("range");
      const headers: Record<string, string> = {
        "User-Agent": UA,
        Accept: kind === "live" ? "application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,*/*" : "*/*",
        Referer: `${HOST}/`,
        Origin: HOST,
      };
      if (range) headers["Range"] = range;

      let upstream = await fetch(segUrl, { headers, redirect: "follow" });
      let finalUrl = upstream.url || segUrl;

      if (kind === "live" && (upstream.status >= 400 || upstream.headers.get("content-length") === "0")) {
        const tsUrl = `${HOST}/live/${USER}/${PASS}/${id}.ts`;
        upstream = await fetch(tsUrl, { headers, redirect: "follow" });
        finalUrl = upstream.url || tsUrl;
      }

      // For HLS manifests, rewrite segments to proxy through stream-proxy
      const contentType = upstream.headers.get("content-type") || "";
      if (kind === "live" && !contentType.includes("mpegurl") && !finalUrl.includes(".m3u8")) {
        const respHeaders: Record<string, string> = { ...corsHeaders };
        const ct = upstream.headers.get("content-type") || "video/mp2t";
        const cl = upstream.headers.get("content-length");
        if (ct) respHeaders["Content-Type"] = ct;
        if (cl) respHeaders["Content-Length"] = cl;
        respHeaders["Accept-Ranges"] = upstream.headers.get("accept-ranges") || "bytes";
        return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
      }

      if (primaryExt === "m3u8" || contentType.includes("mpegurl") || contentType.includes("m3u8")) {
        const body = await upstream.text();
        if (!body.trim() && kind === "live") {
          const tsUrl = `${HOST}/live/${USER}/${PASS}/${id}.ts`;
          const ts = await fetch(tsUrl, { headers, redirect: "follow" });
          const respHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": ts.headers.get("content-type") || "video/mp2t", "Accept-Ranges": ts.headers.get("accept-ranges") || "bytes" };
          const cl = ts.headers.get("content-length");
          if (cl) respHeaders["Content-Length"] = cl;
          return new Response(ts.body, { status: ts.status, headers: respHeaders });
        }
        const finalParsed = new URL(finalUrl);
        const base = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
        const origin = `${finalParsed.protocol}//${finalParsed.host}`;
        const proxyBase = `${url.origin}/functions/v1/iptv-xtream?op=relay&target=`;
        const resolve = (t: string) => {
          if (/^https?:\/\//i.test(t)) return t;
          if (t.startsWith("//")) return `${finalParsed.protocol}${t}`;
          if (t.startsWith("/")) return `${origin}${t}`;
          return base + t;
        };
        const rewritten = body.split("\n").map((line) => {
          const t = line.trim();
          if (!t) return line;
          if (t.startsWith("#")) {
            // rewrite URI="..." inside tags (EXT-X-KEY, EXT-X-MAP, etc.)
            if (t.includes('URI="')) {
              return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${proxyBase}${encodeURIComponent(resolve(u))}"`);
            }
            return line;
          }
          return `${proxyBase}${encodeURIComponent(resolve(t))}`;
        }).join("\n");
        return new Response(rewritten, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
        });
      }

      // Binary stream (MP4 etc.) — pipe through with range support
      const respHeaders: Record<string, string> = { ...corsHeaders };
      const ct = upstream.headers.get("content-type");
      const cl = upstream.headers.get("content-length");
      const cr = upstream.headers.get("content-range");
      const ar = upstream.headers.get("accept-ranges");
      if (ct) respHeaders["Content-Type"] = ct;
      if (cl) respHeaders["Content-Length"] = cl;
      if (cr) respHeaders["Content-Range"] = cr;
      respHeaders["Accept-Ranges"] = ar || "bytes";
      return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    }

    // ── Logo proxy ──
    if (op === "logo") {
      const target = url.searchParams.get("url");
      if (!target) return new Response("missing url", { status: 400, headers: corsHeaders });
      const upstream = await fetch(target, { headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" } });
      if (!upstream.ok) return new Response("not found", { status: upstream.status, headers: corsHeaders });
      const ct = upstream.headers.get("content-type") || "image/png";
      return new Response(upstream.body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": ct, "Cache-Control": "public, max-age=86400" },
      });
    }

    const cat = url.searchParams.get("cat");
    const q = url.searchParams.get("q")?.toLowerCase() || "";

    let data: unknown;
    if (op === "live_categories") data = await xtream("get_live_categories");
    else if (op === "vod_categories") data = await xtream("get_vod_categories");
    else if (op === "series_categories") data = await xtream("get_series_categories");
    else if (op === "live") data = await xtream("get_live_streams", cat ? { category_id: cat } : {});
    else if (op === "vod") data = await xtream("get_vod_streams", cat ? { category_id: cat } : {});
    else if (op === "series") data = await xtream("get_series", cat ? { category_id: cat } : {});
    else if (op === "series_info") data = await xtream("get_series_info", { series_id: url.searchParams.get("id") || "" });
    else if (op === "vod_info") data = await xtream("get_vod_info", { vod_id: url.searchParams.get("id") || "" });
    else return new Response(JSON.stringify({ error: "bad op" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (q && Array.isArray(data)) {
      data = (data as Array<Record<string, unknown>>).filter((it) => String(it.name || "").toLowerCase().includes(q));
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
