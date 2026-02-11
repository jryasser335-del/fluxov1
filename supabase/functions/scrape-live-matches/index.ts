import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_BASE = "https://embedsports.top/embed";
const MOVIEBITE_BASE = "https://app.moviebite.cc";

function buildLink(source: string, id: string): string {
  return `${EMBED_BASE}/${source}/${id}/1?autoplay=1`;
}

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

// Función para generar slug desde el título
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+vs\s+/gi, "-vs-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Función para obtener los sources de un partido individual de MovieBite
async function getMovieBiteMatchSources(matchId: string, title: string): Promise<MatchSource[]> {
  const sources: MatchSource[] = [];

  try {
    const slug = generateSlug(title);
    const matchUrl = `${MOVIEBITE_BASE}/stream/${slug}-${matchId}`;

    console.log(`Fetching MovieBite match: ${matchUrl}`);

    // Primero intentar obtener desde la API del partido
    try {
      const apiResponse = await fetch(`${MOVIEBITE_BASE}/api/stream/${matchId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          Referer: matchUrl,
        },
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();

        // Extraer sources de la respuesta de la API
        if (apiData.sources && Array.isArray(apiData.sources)) {
          for (const src of apiData.sources) {
            if (src.name && src.embed) {
              const embedMatch = src.embed.match(/\/([^\/]+)\/([^\/]+)/);
              if (embedMatch) {
                sources.push({
                  source: embedMatch[1].toLowerCase(),
                  id: embedMatch[2],
                });
              }
            } else if (src.source && src.id) {
              sources.push({
                source: src.source.toLowerCase(),
                id: src.id,
              });
            }
          }
        }

        if (apiData.streams && Array.isArray(apiData.streams)) {
          for (const stream of apiData.streams) {
            if (stream.source && stream.id) {
              sources.push({
                source: stream.source.toLowerCase(),
                id: stream.id,
              });
            }
          }
        }
      }
    } catch (apiError) {
      console.log(`API fetch failed for ${matchId}, trying HTML scraping`);
    }

    // Si no hay sources de la API, intentar scrapear el HTML
    if (sources.length === 0) {
      const htmlResponse = await fetch(matchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
          Referer: `${MOVIEBITE_BASE}/schedule`,
        },
      });

      if (htmlResponse.ok) {
        const html = await htmlResponse.text();

        // Buscar patrones de sources en el HTML
        const sourcePatterns = [
          { name: "admin", regex: /["']admin["']\s*:\s*["']([^"']+)["']/i },
          { name: "delta", regex: /["']delta["']\s*:\s*["']([^"']+)["']/i },
          { name: "echo", regex: /["']echo["']\s*:\s*["']([^"']+)["']/i },
          { name: "golf", regex: /["']golf["']\s*:\s*["']([^"']+)["']/i },
        ];

        for (const pattern of sourcePatterns) {
          const match = html.match(pattern.regex);
          if (match) {
            sources.push({
              source: pattern.name,
              id: match[1],
            });
          }
        }

        // También buscar en formatos alternativos
        const embedMatches = html.matchAll(/embed\/([^\/]+)\/([^\/\s"']+)/gi);
        for (const match of embedMatches) {
          const sourceName = match[1].toLowerCase();
          const sourceId = match[2];

          if (!sources.some((s) => s.source === sourceName && s.id === sourceId)) {
            sources.push({
              source: sourceName,
              id: sourceId,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching sources for match ${matchId}:`, error);
  }

  return sources;
}

// Función para obtener todos los partidos de MovieBite
async function fetchMovieBiteMatches(): Promise<MatchData[]> {
  const matches: MatchData[] = [];

  try {
    console.log("Fetching MovieBite schedule...");

    // Intentar obtener el schedule desde la API
    const scheduleResponse = await fetch(`${MOVIEBITE_BASE}/api/schedule`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: `${MOVIEBITE_BASE}/schedule`,
      },
    });

    if (!scheduleResponse.ok) {
      console.log(`MovieBite schedule API returned ${scheduleResponse.status}`);
      return matches;
    }

    const scheduleData = await scheduleResponse.json();

    // Extraer la lista de eventos
    let events: any[] = [];
    if (Array.isArray(scheduleData)) {
      events = scheduleData;
    } else if (scheduleData.events) {
      events = scheduleData.events;
    } else if (scheduleData.data) {
      events = scheduleData.data;
    }

    console.log(`Found ${events.length} events in MovieBite schedule`);

    // Para cada evento, obtener sus sources
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      try {
        const matchId = event.id || event._id || `moviebite_${i}`;
        const title = event.title || event.name || "Unknown Match";

        console.log(`Processing ${i + 1}/${events.length}: ${title}`);

        // Obtener los sources de este partido
        const sources = await getMovieBiteMatchSources(matchId, title);

        if (sources.length > 0) {
          matches.push({
            id: matchId,
            title: title,
            category: event.category || event.sport || event.league || "unknown",
            teams: event.teams
              ? {
                  home: { name: event.teams.home?.name || "" },
                  away: { name: event.teams.away?.name || "" },
                }
              : undefined,
            sources: sources,
          });
        }

        // Pausa para no saturar el servidor
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (eventError) {
        console.error(`Error processing event ${i}:`, eventError);
      }
    }

    console.log(`Successfully scraped ${matches.length} matches from MovieBite`);
  } catch (error) {
    console.error("Error fetching MovieBite schedule:", error);
  }

  return matches;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if this is a cron call (no auth header) or admin call
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      // Manual call - verify admin
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // If no auth header, allow cron execution (called by pg_cron internally)

    console.log("Starting scraper execution...");

    let allMatches: MatchData[] = [];

    // 1. Obtener partidos de la API original (streamed.pk)
    try {
      console.log("Fetching from streamed.pk API...");
      const apiResponse = await fetch("https://streamed.pk/api/matches/all", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (apiResponse.ok) {
        const apiMatches: MatchData[] = await apiResponse.json();
        console.log(`Fetched ${apiMatches.length} matches from streamed.pk`);
        allMatches = [...apiMatches];
      }
    } catch (apiError) {
      console.error("Error fetching from streamed.pk API:", apiError);
    }

    // 2. Obtener partidos de MovieBite (ESTE ES EL NUEVO SCRAPER)
    try {
      const movieBiteMatches = await fetchMovieBiteMatches();
      console.log(`Fetched ${movieBiteMatches.length} matches from MovieBite`);
      allMatches = [...allMatches, ...movieBiteMatches];
    } catch (scrapeError) {
      console.error("Error fetching MovieBite schedule:", scrapeError);
    }

    // Remove duplicates based on match title and teams
    const uniqueMatches = new Map<string, MatchData>();
    for (const match of allMatches) {
      const homeTeam = match.teams?.home?.name || "";
      const awayTeam = match.teams?.away?.name || "";
      const key = `${match.title}_${homeTeam}_${awayTeam}`.toLowerCase();

      if (!uniqueMatches.has(key)) {
        uniqueMatches.set(key, match);
      } else {
        // Merge sources from duplicate matches
        const existing = uniqueMatches.get(key)!;
        const newSources = match.sources.filter(
          (newSrc) =>
            !existing.sources.some(
              (existingSrc) => existingSrc.source === newSrc.source && existingSrc.id === newSrc.id,
            ),
        );
        existing.sources.push(...newSources);
      }
    }

    const finalMatches = Array.from(uniqueMatches.values());
    console.log(`Total unique matches after dedup: ${finalMatches.length}`);

    // Process matches
    const records = finalMatches.map((match) => {
      const adminSource = match.sources.find((s) => s.source === "admin");
      const deltaSource = match.sources.find((s) => s.source === "delta");
      const echoSource = match.sources.find((s) => s.source === "echo");
      const golfSource = match.sources.find((s) => s.source === "golf");

      return {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: adminSource ? buildLink("admin", adminSource.id) : null,
        source_delta: deltaSource ? buildLink("delta", deltaSource.id) : null,
        source_echo: echoSource ? buildLink("echo", echoSource.id) : null,
        source_golf: golfSource ? buildLink("golf", golfSource.id) : null,
        scanned_at: new Date().toISOString(),
      };
    });

    // Use service role to upsert (bypasses RLS)
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Clear old records and insert new ones
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
        matches: records,
        sources: {
          streamed_pk: allMatches.filter((m) => !m.id.toString().startsWith("moviebite")).length,
          moviebite: allMatches.filter(
            (m) =>
              m.id.toString().startsWith("moviebite") ||
              m.sources.some((s) => ["admin", "delta", "echo", "golf"].includes(s.source)),
          ).length,
        },
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
