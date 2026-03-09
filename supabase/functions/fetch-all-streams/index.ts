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
  source: "ppv" | "streamed" | "moviebite";
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
      break;
    } catch {
      continue;
    }
  }
  return entries;
}

async function fetchStreamedStreams(): Promise<StreamEntry[]> {
  const entries: StreamEntry[] = [];
  // Prefer streamed.pk first (it often has football/Liga MX when streamed.su doesn't)
  const bases = ["https://streamed.pk", "https://streamed.su"];

  const mapLimit = async <T>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<void>) => {
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const idx = next++;
        if (idx >= items.length) break;
        try {
          await fn(items[idx], idx);
        } catch {
          // ignore per-item failures
        }
      }
    });
    await Promise.all(workers);
  };

  const isSoccerLike = (m: any) => {
    const cat = String(m?.category ?? m?.sport ?? "").toLowerCase();
    return cat.includes("football") || cat.includes("soccer") || cat.includes("futbol") || cat.includes("fútbol");
  };

  for (const base of bases) {
    try {
      const matchEndpoints = [
        "/api/matches/live",
        "/api/matches/football",
        "/api/matches/all-today",
        "/api/matches/all",
      ];

      let matches: any[] = [];
      for (const ep of matchEndpoints) {
        const res = await fetchFast(`${base}${ep}`, 8000);
        if (!res?.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          matches = data;
          break;
        }
      }

      if (!matches.length) continue;

      // If live feed doesn't include football (often mixed-sport), fallback to football-specific endpoint
      if (matches.filter(isSoccerLike).length === 0) {
        const rf = await fetchFast(`${base}/api/matches/football`, 8000);
        if (rf?.ok) {
          const fb = await rf.json();
          if (Array.isArray(fb) && fb.length > 0) matches = fb;
        }
      }

      const withSources = matches.filter((m: any) => Array.isArray(m?.sources) && m.sources.length > 0);
      const prioritized = [
        ...withSources.filter(isSoccerLike),
        ...withSources.filter((m: any) => !isSoccerLike(m)),
      ];

      // Keep runtime under control but make sure football matches aren't skipped
      const liveMatches = prioritized.slice(0, 500);

      const prioritySources = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "admin"];

      await mapLimit(liveMatches, 8, async (m: any) => {
        const sources = Array.isArray(m?.sources) ? m.sources : [];
        const src =
          sources.find((s: any) => prioritySources.includes(String(s?.source ?? "").toLowerCase())) ?? sources[0];
        if (!src?.source || !src?.id) return;

        const sourceKey = String(src.source).toLowerCase();
        const sourceId = String(src.id);

        const r = await fetchFast(`${base}/api/stream/${sourceKey}/${sourceId}`, 4000);
        if (!r?.ok) return;
        const streams = await r.json();
        if (!Array.isArray(streams) || !streams.length) return;

        const hd =
          streams.find((s: any) => s?.hd) ??
          streams.find((s: any) => String(s?.quality ?? "").toLowerCase() === "hd") ??
          streams[0];

        const embedUrl = hd?.embedUrl ?? hd?.embed_url ?? hd?.url;
        if (!embedUrl) return;

        const home = m?.teams?.home?.name || m?.homeTeam || m?.home || "";
        const away = m?.teams?.away?.name || m?.awayTeam || m?.away || "";
        const name = home && away ? `${home} vs ${away}` : m?.title || m?.name || "Unknown";

        entries.push({
          id: `str-${m?.id || `${sourceKey}-${sourceId}` || name}`,
          name,
          category: m?.category || m?.sport || "Football",
          iframe: embedUrl,
          poster: null,
          viewers: 0,
          source: "streamed",
          channels: home && away ? `${home}|${away}` : "",
        });
      });

      break;
    } catch {
      continue;
    }
  }

  return entries;
}

async function fetchMoviebiteStreams(): Promise<StreamEntry[]> {
  const entries: StreamEntry[] = [];
  const API_BASE = "https://api.watchfooty.pw";

  try {
    const res = await fetchFast(`${API_BASE}/api/v1/matches/all`, 4000);
    if (!res?.ok) return entries;
    const matches = await res.json();
    if (!Array.isArray(matches)) return entries;

    const toFetch = matches.slice(0, 40);

    await Promise.all(
      toFetch.map(async (m: any) => {
        const matchId = m.id || m.matchId;
        if (!matchId) return;

        try {
          const r = await fetchFast(`${API_BASE}/api/v1/match/${matchId}`, 2500);
          if (!r?.ok) return;
          const detail = await r.json();

          const home = detail.teams?.home?.name || m.teams?.home?.name || "";
          const away = detail.teams?.away?.name || m.teams?.away?.name || "";
          const name = detail.title || (home && away ? `${home} vs ${away}` : "Unknown");
          const category = detail.sport || detail.league || m.sport || "Other";

          const streams = detail.streams || [];
          const prioritySources = ["hd", "prime", "elite", "omega", "easy", "tv", "delta", "echo"];
          const hdEnglish = streams
            .filter((s: any) => s.url && s.quality === "HD" && (s.language === "English" || s.language === "en"))
            .sort((a: any, b: any) => {
              const ai = prioritySources.indexOf(a.source);
              const bi = prioritySources.indexOf(b.source);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });

          const usedSources = new Set<string>();
          const picked: any[] = [];
          for (const s of hdEnglish) {
            if (picked.length >= 3) break;
            if (!usedSources.has(s.source)) {
              picked.push(s);
              usedSources.add(s.source);
            }
          }

          if (picked.length === 0) {
            const anyHd = streams.filter((s: any) => s.url && s.quality === "HD").slice(0, 1);
            picked.push(...anyHd);
          }

          for (const s of picked) {
            entries.push({
              id: `mb-${matchId}-${s.source}-${s.id || ""}`,
              name,
              category,
              iframe: s.url,
              poster: detail.poster ? `${API_BASE}${detail.poster}` : undefined,
              viewers: 0,
              source: "moviebite",
            });
          }
        } catch { /* skip */ }
      }),
    );
  } catch (err) {
    console.error("Moviebite fetch error:", err);
  }

  return entries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    // Fetch from all three sources in parallel
    const [ppvStreams, streamedStreams, moviebiteStreams] = await Promise.all([
      fetchPPVStreams(),
      fetchStreamedStreams(),
      fetchMoviebiteStreams(),
    ]);

    const allStreams = [...ppvStreams, ...streamedStreams, ...moviebiteStreams];

    console.log(`📡 Bulk fetch: ${ppvStreams.length} PPV + ${streamedStreams.length} Streamed + ${moviebiteStreams.length} Moviebite = ${allStreams.length} total in ${Date.now() - t0}ms`);

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
