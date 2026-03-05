import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_BASE = "https://embedsports.top/embed";

function buildLink(source: string, id: string): string {
  return `${EMBED_BASE}/${source}/${id}/1?autoplay=1`;
}

const SOURCE_MAP: Record<string, { field: string; embedName: string }> = {
  vola: { field: "source_admin", embedName: "admin" },
  main: { field: "source_admin", embedName: "admin" },
  admin: { field: "source_admin", embedName: "admin" },
  delta: { field: "source_delta", embedName: "delta" },
  echo: { field: "source_echo", embedName: "echo" },
  mv: { field: "source_golf", embedName: "golf" },
  golf: { field: "source_golf", embedName: "golf" },
};

const ALLOWED_CATEGORIES = new Set([
  "football", "basketball", "baseball",
  "fighting", "wrestling", "wwe", "ufc", "mma", "boxing",
  "tennis", "hockey", "rugby", "cricket", "motorsport",
  "afl", "darts", "handball", "volleyball", "cycling",
]);

const PPV_CATEGORY_MAP: Record<string, string> = {
  "Basketball": "basketball",
  "Football": "football",
  "Baseball": "baseball",
  "Ice Hockey": "hockey",
  "Combat Sports": "fighting",
  "Wrestling": "wrestling",
  "American Football": "football",
  "Arm Wrestling": "fighting",
  "Cricket": "cricket",
  "Motorsports": "motorsport",
  "Tennis": "tennis",
  "Rugby": "rugby",
  "Boxing": "boxing",
  "MMA": "mma",
  "Cycling": "cycling",
  "Darts": "darts",
};

interface MatchSource {
  source: string;
  id: string;
}

interface MatchData {
  id: string;
  title: string;
  category: string;
  teams?: {
    home?: { name: string };
    away?: { name: string };
  };
  sources: MatchSource[];
}

function parseTeams(title: string): { home: string; away: string } | null {
  const separators = [" vs. ", " vs ", " v ", " - ", " VS ", " Vs "];
  for (const sep of separators) {
    const idx = title.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) {
      const home = title.substring(0, idx).trim();
      const away = title.substring(idx + sep.length).trim();
      if (home && away) return { home, away };
    }
  }
  return null;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function fetchWithTimeout(url: string, timeoutMs = 8000, headers: Record<string, string> = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        ...headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    console.error(`Fetch failed: ${url}`, e.message);
    return null;
  }
}

// ── Source: Streamed / SportsBite / MovieBite (main aggregator) ──
async function fetchStreamedMatches(): Promise<MatchData[]> {
  const urls = [
    "https://streamed.pk/api/matches/all",
    "https://sportsbite.top/api/matches/all",
    "https://app.moviebite.cc/api/schedule",
  ];

  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetchWithTimeout(url, 10000);
      if (response?.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) break;
        const matches = await response.json();
        console.log(`Fetched ${matches.length} matches from ${url}`);
        return matches;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return [];
}

// ── Source: PPV.to ──
async function fetchPPV(): Promise<{ title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]> {
  try {
    const response = await fetchWithTimeout("https://api.ppv.to/api/streams");
    if (!response?.ok) return [];
    const data = await response.json();
    if (!data.success || !data.streams) return [];

    const events: any[] = [];
    for (const category of data.streams) {
      const catName = category.category || "";
      const mappedCat = PPV_CATEGORY_MAP[catName] || "other";
      for (const stream of category.streams || []) {
        if (!stream.name || !stream.iframe || stream.always_live) continue;
        const teams = parseTeams(stream.name);
        events.push({ title: stream.name, category: mappedCat, embedUrl: stream.iframe, teamHome: teams?.home || null, teamAway: teams?.away || null });
      }
    }
    console.log(`PPV.to: Found ${events.length} events`);
    return events;
  } catch (e) {
    console.error("PPV.to failed:", e.message);
    return [];
  }
}

// ── Source: BINTV ──
async function fetchBINTV(): Promise<{ title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]> {
  try {
    // Try BINTV API
    const response = await fetchWithTimeout("https://bintv.net/api/matches", 8000);
    if (!response?.ok) {
      // Try alternative endpoint
      const alt = await fetchWithTimeout("https://bintv.net/api/streams", 8000);
      if (!alt?.ok) return [];
      const data = await alt.json();
      return processGenericMatches(data, "bintv");
    }
    const data = await response.json();
    return processGenericMatches(data, "bintv");
  } catch (e) {
    console.error("BINTV failed:", e.message);
    return [];
  }
}

// ── Source: DaddyLive ──
async function fetchDaddyLive(): Promise<{ title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]> {
  try {
    const urls = [
      "https://daddylive.to/schedule.php",
      "https://daddylive2.to/schedule.php",
    ];
    for (const url of urls) {
      const response = await fetchWithTimeout(url, 8000, { Accept: "text/html,application/json" });
      if (!response?.ok) continue;
      const text = await response.text();
      // Try to extract JSON data from page
      const jsonMatch = text.match(/var\s+schedule\s*=\s*(\[[\s\S]*?\]);/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          return processGenericMatches(data, "daddylive");
        } catch { continue; }
      }
    }
    return [];
  } catch (e) {
    console.error("DaddyLive failed:", e.message);
    return [];
  }
}

// ── Source: StreamEast ──
async function fetchStreamEast(): Promise<{ title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]> {
  try {
    const urls = [
      "https://streameast.to/api/matches",
      "https://streameast2.to/api/matches",
    ];
    for (const url of urls) {
      const response = await fetchWithTimeout(url, 8000);
      if (!response?.ok) continue;
      const data = await response.json();
      return processGenericMatches(data, "streameast");
    }
    return [];
  } catch (e) {
    console.error("StreamEast failed:", e.message);
    return [];
  }
}

// ── Source: WatchSports ──
async function fetchWatchSports(): Promise<{ title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]> {
  try {
    const response = await fetchWithTimeout("https://watchsports.live/api/matches", 8000);
    if (!response?.ok) return [];
    const data = await response.json();
    return processGenericMatches(data, "watchsports");
  } catch (e) {
    console.error("WatchSports failed:", e.message);
    return [];
  }
}

// Generic match processor for alternative sources
function processGenericMatches(data: any, source: string): { title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[] {
  const events: any[] = [];
  try {
    const items = Array.isArray(data) ? data : data.matches || data.streams || data.events || [];
    for (const item of items) {
      const title = item.title || item.name || item.match_title || "";
      if (!title) continue;
      const url = item.iframe || item.embed_url || item.stream_url || item.url || "";
      if (!url) continue;
      const cat = normalize(item.category || item.sport || item.league || "other");
      const mappedCat = ALLOWED_CATEGORIES.has(cat) ? cat : PPV_CATEGORY_MAP[item.category || ""] || "other";
      const teams = item.teams ? { home: item.teams.home?.name || item.teams.home, away: item.teams.away?.name || item.teams.away } : parseTeams(title);
      events.push({
        title,
        category: mappedCat,
        embedUrl: url,
        teamHome: teams?.home || null,
        teamAway: teams?.away || null,
      });
    }
    console.log(`${source}: Found ${events.length} events`);
  } catch (e) {
    console.error(`${source} processing failed:`, e.message);
  }
  return events;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Main source: Streamed/SportsBite ──
    const matches = await fetchStreamedMatches();

    const filteredMatches = matches.filter((m) => ALLOWED_CATEGORIES.has((m.category || "").toLowerCase()));
    const qualityMatches = filteredMatches.filter((match) => {
      const homeName = match.teams?.home?.name?.trim();
      const awayName = match.teams?.away?.name?.trim();
      if (!homeName || !awayName) return false;
      return match.sources?.some((s) => SOURCE_MAP[s.source]);
    });

    const records: Record<string, any>[] = qualityMatches.map((match) => {
      const record: Record<string, string | null> = {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: null, source_delta: null, source_echo: null, source_golf: null,
        scanned_at: new Date().toISOString(),
      };
      for (const src of match.sources) {
        const mapping = SOURCE_MAP[src.source];
        if (mapping) record[mapping.field] = buildLink(mapping.embedName, src.id);
      }
      return record;
    });

    // ── 2. Supplementary sources (parallel) ──
    const [ppvEvents, bintvEvents, daddyEvents, streamEastEvents, watchSportsEvents] = await Promise.all([
      fetchPPV(),
      fetchBINTV(),
      fetchDaddyLive(),
      fetchStreamEast(),
      fetchWatchSports(),
    ]);

    const allSupplementary = [...ppvEvents, ...bintvEvents, ...daddyEvents, ...streamEastEvents, ...watchSportsEvents];
    let supplementaryAdded = 0;
    let supplementaryEnriched = 0;

    for (const sup of allSupplementary) {
      if (!sup.embedUrl || !sup.teamHome || !sup.teamAway) continue;

      // Try to find existing record and enrich
      const existingIdx = records.findIndex((r) => {
        if (!r.team_home || !r.team_away) return false;
        const rHome = normalize(r.team_home);
        const rAway = normalize(r.team_away);
        const pH = normalize(sup.teamHome!);
        const pA = normalize(sup.teamAway!);
        const homeWords = pH.split(/\s+/).filter((w: string) => w.length > 3);
        const awayWords = pA.split(/\s+/).filter((w: string) => w.length > 3);
        const homeMatch = homeWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        const awayMatch = awayWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        return homeMatch && awayMatch;
      });

      if (existingIdx >= 0) {
        // Enrich: fill empty source slots
        const r = records[existingIdx];
        if (!r.source_golf) { r.source_golf = sup.embedUrl; supplementaryEnriched++; }
        else if (!r.source_echo) { r.source_echo = sup.embedUrl; supplementaryEnriched++; }
        else if (!r.source_delta) { r.source_delta = sup.embedUrl; supplementaryEnriched++; }
      } else if (sup.category !== "other") {
        const slugId = sup.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
        records.push({
          match_id: `sup-${slugId}`,
          match_title: sup.title,
          category: sup.category,
          team_home: sup.teamHome,
          team_away: sup.teamAway,
          source_admin: null, source_delta: null, source_echo: null,
          source_golf: sup.embedUrl,
          scanned_at: new Date().toISOString(),
        });
        supplementaryAdded++;
      }
    }

    // ── 3. Save to database ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (records.length > 0) {
      const { error: insertError } = await adminClient.from("live_scraped_links").upsert(records, { onConflict: "match_id" });
      if (insertError) { console.error("Insert error:", insertError); throw new Error(insertError.message); }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: records.length,
        main: qualityMatches.length,
        ppv: ppvEvents.length,
        bintv: bintvEvents.length,
        daddylive: daddyEvents.length,
        streameast: streamEastEvents.length,
        watchsports: watchSportsEvents.length,
        supplementaryAdded,
        supplementaryEnriched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
