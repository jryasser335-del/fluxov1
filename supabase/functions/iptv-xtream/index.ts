import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const HOST = "http://starlatino.tv:8880";
const USER = "murnnopccm";
const PASS = "bnaggtvRtwHh";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 10 * 60 * 1000;

async function xtream(action: string, extra: Record<string, string> = {}) {
  const key = action + JSON.stringify(extra);
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data;
  const params = new URLSearchParams({ username: USER, password: PASS, action, ...extra });
  const r = await fetch(`${HOST}/player_api.php?${params}`, {
    headers: { "User-Agent": "VLC/3.0.18 LibVLC/3.0.18" },
  });
  const data = await r.json();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op") || "live_categories";
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
