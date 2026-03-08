import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STREAMED_BASES = [
  "https://streamed.su",
  "https://streamed.pk",
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function tokenize(name: string): string[] {
  const stopwords = new Set(["fc", "cf", "sc", "ac", "club", "the", "de", "la", "el", "vs", "v"]);
  return normalize(name).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !stopwords.has(t));
}

function matchScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

function buildLinks(urls: { url: string; source: string }[]) {
  return {
    url1: urls[0]?.url || null,
    url2: urls[1]?.url || null,
    url3: urls[2]?.url || null,
    source1: urls[0]?.source || null,
    source2: urls[1]?.source || null,
    source3: urls[2]?.source || null,
  };
}

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

// Race a promise against a deadline; returns null on timeout
function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

async function findFastDbLinks(supabase: any, homeTeam: string, awayTeam: string, espnId?: string) {
  if (espnId) {
    const { data: eventById } = await supabase
      .from("events")
      .select("stream_url, stream_url_2, stream_url_3")
      .eq("espn_id", espnId)
      .not("stream_url", "is", null)
      .maybeSingle();

    if (eventById?.stream_url) {
      return buildLinks([
        { url: eventById.stream_url, source: "events" },
        ...(eventById.stream_url_2 ? [{ url: eventById.stream_url_2, source: "events" }] : []),
        ...(eventById.stream_url_3 ? [{ url: eventById.stream_url_3, source: "events" }] : []),
      ]);
    }
  }

  const { data: scraped } = await supabase
    .from("live_scraped_links")
    .select("team_home, team_away, source_admin, source_delta, source_echo, source_golf")
    .limit(300);

  let best: any = null;
  let bestScore = 0;

  for (const row of scraped || []) {
    if (!row.team_home || !row.team_away) continue;
    const direct = (matchScore(homeTeam, row.team_home) + matchScore(awayTeam, row.team_away)) / 2;
    const swapped = (matchScore(homeTeam, row.team_away) + matchScore(awayTeam, row.team_home)) / 2;
    const score = Math.max(direct, swapped);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (best && bestScore >= 0.55) {
    const urls: { url: string; source: string }[] = [];
    if (best.source_admin) urls.push({ url: best.source_admin, source: "ppv/streamed" });
    if (best.source_delta) urls.push({ url: best.source_delta, source: "streamed" });
    if (best.source_echo) urls.push({ url: best.source_echo, source: "streamed" });
    if (best.source_golf) urls.push({ url: best.source_golf, source: "streamed" });
    if (urls.length) return buildLinks(urls);
  }

  return null;
}

async function findStreamedMatch(homeTeam: string, awayTeam: string): Promise<string[]> {
  for (const base of STREAMED_BASES) {
    try {
      const res = await fetchWithTimeout(`${base}/api/matches/all`, 3000);
      if (!res?.ok) continue;
      const matches = await res.json();

      let bestMatch: any = null;
      let bestScore = 0;

      for (const m of matches) {
        const mHome = m.teams?.home?.name || "";
        const mAway = m.teams?.away?.name || "";
        if (!mHome || !mAway) continue;

        const direct = (matchScore(homeTeam, mHome) + matchScore(awayTeam, mAway)) / 2;
        const swapped = (matchScore(homeTeam, mAway) + matchScore(awayTeam, mHome)) / 2;
        const score = Math.max(direct, swapped);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = m;
        }
      }

      if (bestMatch && bestScore >= 0.5) {
        const hdSources = ["alpha", "bravo", "charlie", "delta", "echo"];
        const sources = (bestMatch.sources || []).filter((s: any) => hdSources.includes(s.source));

        // Resolve first 2 sources in parallel, use first base that works
        const embedUrls: string[] = [];
        await Promise.all(
          sources.slice(0, 2).map(async (src: any) => {
            const r = await fetchWithTimeout(`${base}/api/stream/${src.source}/${src.id}`, 2500);
            if (!r?.ok) return;
            const streams = await r.json();
            if (Array.isArray(streams) && streams.length > 0) {
              const hd = streams.find((s: any) => s.hd) || streams[0];
              if (hd?.embedUrl && !embedUrls.includes(hd.embedUrl)) embedUrls.push(hd.embedUrl);
            }
          }),
        );
        return embedUrls;
      }
      // If we got matches but no match, don't try next base
      break;
    } catch {
      continue;
    }
  }
  return [];
}

async function findPPVMatch(homeTeam: string, awayTeam: string): Promise<string | null> {
  for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
    try {
      const res = await fetchWithTimeout(url, 3000);
      if (!res?.ok) continue;
      const data = await res.json();
      if (!data.success || !data.streams) continue;

      let bestUrl: string | null = null;
      let bestScore = 0;

      for (const category of data.streams) {
        for (const stream of category.streams || []) {
          if (!stream.name || !stream.iframe || stream.always_live) continue;
          const score = (matchScore(homeTeam, stream.name) + matchScore(awayTeam, stream.name)) / 2;
          if (score > bestScore) {
            bestScore = score;
            bestUrl = stream.iframe;
          }
        }
      }

      if (bestUrl && bestScore >= 0.3) return bestUrl;
    } catch {
      continue;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { homeTeam, awayTeam, espnId, sport } = await req.json();
    if (!homeTeam || !awayTeam) {
      return new Response(JSON.stringify({ error: "homeTeam and awayTeam required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // FAST PATH: DB links (usually <200ms)
    const fastLinks = await raceTimeout(findFastDbLinks(supabase, homeTeam, awayTeam, espnId), 3000);
    if (fastLinks?.url1) {
      return new Response(JSON.stringify({ success: true, links: fastLinks, fast: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Resolving streams for: ${homeTeam} vs ${awayTeam}`);

    // SLOW PATH: external providers - strict 6s global deadline
    const externalResult = await raceTimeout(
      Promise.all([
        findPPVMatch(homeTeam, awayTeam),
        findStreamedMatch(homeTeam, awayTeam),
      ]),
      6000,
    );

    const ppvUrl = externalResult?.[0] || null;
    const streamedUrls = externalResult?.[1] || [];

    const allUrls: { url: string; source: string }[] = [];
    if (ppvUrl) allUrls.push({ url: ppvUrl, source: "ppv" });
    for (const url of streamedUrls) allUrls.push({ url, source: "streamed" });

    const links = buildLinks(allUrls);

    // Save to DB in background (don't await)
    if (links.url1 && espnId) {
      const payload = {
        stream_url: links.url1,
        stream_url_2: links.url2,
        stream_url_3: links.url3,
        pending_url: links.url1,
        is_live: true,
        is_active: true,
      };

      supabase.from("events").select("id").eq("espn_id", espnId).maybeSingle().then(({ data: existing }) => {
        if (existing?.id) {
          supabase.from("events").update(payload).eq("id", existing.id).then(() => {});
        } else {
          supabase.from("events").insert({
            espn_id: espnId,
            name: `${homeTeam} vs ${awayTeam}`,
            team_home: homeTeam,
            team_away: awayTeam,
            sport: sport || "Other",
            event_date: new Date().toISOString(),
            ...payload,
          }).then(() => {});
        }
      });
    }

    return new Response(JSON.stringify({ success: true, links, fast: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
