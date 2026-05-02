import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

const HOST = "http://starlatino.tv:8880";
const USER = "murnnopccm";
const PASS = "bnaggtvRtwHh";
const UA = "VLC/3.0.18 LibVLC/3.0.18";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 10 * 60 * 1000;

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

    // ── Stream proxy (live HLS, vod MP4, series MP4) ──
    if (op === "stream") {
      const kind = url.searchParams.get("kind") || "live"; // live | movie | series
      const id = url.searchParams.get("id");
      const ext = url.searchParams.get("ext") || (kind === "live" ? "m3u8" : "mp4");
      if (!id) return new Response("missing id", { status: 400, headers: corsHeaders });

      const segUrl = `${HOST}/${kind}/${USER}/${PASS}/${id}.${ext}`;
      const range = req.headers.get("range");
      const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };
      if (range) headers["Range"] = range;

      const upstream = await fetch(segUrl, { headers });

      // For HLS manifests, rewrite segments to proxy through stream-proxy
      if (ext === "m3u8" || (upstream.headers.get("content-type") || "").includes("mpegurl")) {
        const body = await upstream.text();
        const base = segUrl.substring(0, segUrl.lastIndexOf("/") + 1);
        const proxyBase = `${url.origin}/functions/v1/stream-proxy?url=`;
        const rewritten = body.split("\n").map((line) => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return line;
          const abs = t.startsWith("http") ? t : base + t;
          return `${proxyBase}${encodeURIComponent(abs)}`;
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
