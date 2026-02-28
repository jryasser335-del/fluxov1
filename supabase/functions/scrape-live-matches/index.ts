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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
            if (!contentType.includes("json")) {
              console.error(`${url} returned non-JSON: ${contentType}`);
              break;
            }
            matches = await response.json();
            console.log(`Fetched ${matches.length} matches from ${url} (attempt ${attempt + 1})`);
            break;
          }
        } catch (e) {
          console.error(`Failed ${url} attempt ${attempt + 1}:`, e.message);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
      if (matches.length > 0) break;
    }

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not fetch schedule from any endpoint" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Filter to allowed categories
    const filteredMatches = matches.filter((m) => {
      const cat = (m.category || "").toLowerCase();
      return ALLOWED_CATEGORIES.has(cat);
    });

    // QUALITY FILTER: Only keep matches with COMPLETE team info
    const qualityMatches = filteredMatches.filter((match) => {
      const homeName = match.teams?.home?.name?.trim();
      const awayName = match.teams?.away?.name?.trim();

      // Must have both team names
      if (!homeName || !awayName) return false;

      // Must have at least one valid source
      const hasSource = match.sources?.some((s) => SOURCE_MAP[s.source]);
      if (!hasSource) return false;

      return true;
    });

    const skippedIncomplete = filteredMatches.length - qualityMatches.length;

    // Process matches with source mapping
    const records = qualityMatches.map((match) => {
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
