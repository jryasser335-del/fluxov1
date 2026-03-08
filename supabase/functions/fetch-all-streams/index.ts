import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchFast(url: string, timeoutMs = 3000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

interface StreamEntry {
  id: string;
  name: string;
  category: string;
  iframe: string;
  poster?: string;
  viewers?: number;
  source: "ppv" | "streamed";
  channels?: string;
}

async function fetchPPVStreams(): Promise<StreamEntry[]> {
  const entries: StreamEntry[] = [];
  for (const apiUrl of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
    try {
      const res = await fetchFast(apiUrl, 3000);
      if (!res?.ok) continue;
      const data = await res.json();
      if (!data.success || !data.streams) continue;

      for (const category of data.streams) {
        for (const stream of category.streams || []) {
          if (!stream.name || !stream.iframe) continue;
          entries.push({
            id: `ppv-${stream.id || stream.name}`,
            name: stream.name,
            category: category.name || "Other",
            iframe: stream.iframe,
            poster: stream.poster || stream.thumbnail || null,
            viewers: stream.viewers || 0,
            source: "ppv",
            channels: stream.channels || "",
          });
        }
      }
      break; // success, no need to try next mirror
    } catch {
      continue;
    }
  }
  return entries;
}

async function fetchStreamedStreams(): Promise<StreamEntry[]> {
  const entries: StreamEntry[] = [];
  const bases = ["https://streamed.su", "https://streamed.pk"];
  
  for (const base of bases) {
    try {
      const res = await fetchFast(`${base}/api/matches/all`, 3000);
      if (!res?.ok) continue;
      const matches = await res.json();

      // Get embed URLs for live matches only
      const liveMatches = matches.filter((m: any) => {
        const sources = m.sources || [];
        return sources.length > 0;
      }).slice(0, 30); // limit to avoid too many requests

      await Promise.all(
        liveMatches.map(async (m: any) => {
          const hdSources = ["alpha", "bravo", "charlie"];
          const src = (m.sources || []).find((s: any) => hdSources.includes(s.source)) || m.sources?.[0];
          if (!src) return;

          try {
            const r = await fetchFast(`${base}/api/stream/${src.source}/${src.id}`, 2000);
            if (!r?.ok) return;
            const streams = await r.json();
            if (!Array.isArray(streams) || !streams.length) return;
            const hd = streams.find((s: any) => s.hd) || streams[0];
            if (!hd?.embedUrl) return;

            const home = m.teams?.home?.name || "";
            const away = m.teams?.away?.name || "";
            const name = home && away ? `${home} vs ${away}` : m.title || "Unknown";

            entries.push({
              id: `str-${m.id || name}`,
              name,
              category: m.category || m.sport || "Football",
              iframe: hd.embedUrl,
              poster: null,
              viewers: 0,
              source: "streamed",
            });
          } catch { /* skip */ }
        }),
      );
      break;
    } catch {
      continue;
    }
  }
  return entries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    // Fetch from both sources in parallel
    const [ppvStreams, streamedStreams] = await Promise.all([
      fetchPPVStreams(),
      fetchStreamedStreams(),
    ]);

    const allStreams = [...ppvStreams, ...streamedStreams];

    console.log(`📡 Bulk fetch: ${ppvStreams.length} PPV + ${streamedStreams.length} Streamed = ${allStreams.length} total in ${Date.now() - t0}ms`);

    return new Response(
      JSON.stringify({ success: true, streams: allStreams, count: allStreams.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, error: error.message, streams: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
