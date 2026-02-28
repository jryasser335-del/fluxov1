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
  "afl", "darts", "handball", "volleyball",
]);

// PPV.to category mapping
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

interface PPVEvent {
  title: string;
  category: string;
  embedUrl: string;
  teamHome: string | null;
  teamAway: string | null;
}

/** Extract team names from a "Team A vs. Team B" title */
function parseTeams(title: string): { home: string; away: string } | null {
  const separators = [" vs. ", " vs ", " v ", " - "];
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

/** Fetch PPV.to events via their JSON API */
async function fetchPPV(): Promise<PPVEvent[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.ppv.to/api/streams", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return [];
    const data = await response.json();
    if (!data.success || !data.streams) return [];

    const events: PPVEvent[] = [];
    for (const category of data.streams) {
      const catName = category.category || "";
      const mappedCat = PPV_CATEGORY_MAP[catName] || "other";

      for (const stream of category.streams || []) {
        if (!stream.name || !stream.iframe) continue;
        // Skip always_live channels (24/7 streams)
        if (stream.always_live) continue;

        const teams = parseTeams(stream.name);
        events.push({
          title: stream.name,
          category: mappedCat,
          embedUrl: stream.iframe,
          teamHome: teams?.home || null,
          teamAway: teams?.away || null,
        });
      }
    }

    console.log(`PPV.to API: Found ${events.length} events`);
    return events;
  } catch (e) {
    console.error("PPV.to API failed:", e.message);
    return [];
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Fetch from streamed.pk / sportsbite / moviebite ──
    let matches: MatchData[] = [];
    const urls = [
      "https://streamed.pk/api/matches/all",
      "https://sportsbite.top/api/matches/all",
      "https://app.moviebite.cc/api/schedule",
    ];

    for (const url of urls) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/json",
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("json")) break;
            matches = await response.json();
            console.log(`Fetched ${matches.length} matches from ${url} (attempt ${attempt + 1})`);
            break;
          }
        } catch (e) {
          console.error(`Failed ${url} attempt ${attempt + 1}:`, e.message);
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (matches.length > 0) break;
    }

    // Filter to allowed categories
    const filteredMatches = matches.filter((m) => {
      const cat = (m.category || "").toLowerCase();
      return ALLOWED_CATEGORIES.has(cat);
    });

    // Quality filter: must have both team names and at least one source
    const qualityMatches = filteredMatches.filter((match) => {
      const homeName = match.teams?.home?.name?.trim();
      const awayName = match.teams?.away?.name?.trim();
      if (!homeName || !awayName) return false;
      return match.sources?.some((s) => SOURCE_MAP[s.source]);
    });

    const skippedIncomplete = filteredMatches.length - qualityMatches.length;

    // Build records from main sources
    const records: Record<string, any>[] = qualityMatches.map((match) => {
      const record: Record<string, string | null> = {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: null,
        source_delta: null,
        source_echo: null,
        source_golf: null,
        scanned_at: new Date().toISOString(),
      };

      for (const src of match.sources) {
        const mapping = SOURCE_MAP[src.source];
        if (mapping) {
          record[mapping.field] = buildLink(mapping.embedName, src.id);
        }
      }

      return record;
    });

    // ── 2. Fetch from ppv.to as supplementary source ──
    const ppvEvents = await fetchPPV();
    let ppvAdded = 0;
    let ppvEnriched = 0;

    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    for (const ppv of ppvEvents) {
      // Try to find existing record and add ppv as source_golf (backup)
      const existingIdx = records.findIndex((r) => {
        if (!r.team_home || !r.team_away) return false;
        if (!ppv.teamHome || !ppv.teamAway) return false;
        const rHome = normalize(r.team_home);
        const rAway = normalize(r.team_away);
        const pH = normalize(ppv.teamHome);
        const pA = normalize(ppv.teamAway);
        const homeWords = pH.split(/\s+/).filter((w: string) => w.length > 3);
        const awayWords = pA.split(/\s+/).filter((w: string) => w.length > 3);
        const homeMatch = homeWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        const awayMatch = awayWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        return homeMatch && awayMatch;
      });

      if (existingIdx >= 0) {
        if (!records[existingIdx].source_golf) {
          records[existingIdx].source_golf = ppv.embedUrl;
          ppvEnriched++;
        }
      } else if (ppv.teamHome && ppv.teamAway && ppv.category !== "other") {
        // New event only from ppv.to
        const slugId = ppv.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
        records.push({
          match_id: `ppv-${slugId}`,
          match_title: ppv.title,
          category: ppv.category,
          team_home: ppv.teamHome,
          team_away: ppv.teamAway,
          source_admin: null,
          source_delta: null,
          source_echo: null,
          source_golf: ppv.embedUrl,
          scanned_at: new Date().toISOString(),
        });
        ppvAdded++;
      }
    }

    // ── 3. Save to database ──
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Clear old records
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (records.length > 0) {
      const { error: insertError } = await adminClient
        .from("live_scraped_links")
        .upsert(records, { onConflict: "match_id" });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(insertError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: records.length,
        totalFetched: matches.length,
        filtered: matches.length - filteredMatches.length,
        skippedIncomplete,
        ppvTotal: ppvEvents.length,
        ppvAdded,
        ppvEnriched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
