import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_BASE = "https://embedsports.top/embed";
const MOVIEBITE_SCHEDULE = "https://app.moviebite.cc/schedule";

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
  scheduledTime?: string;
}

async function scrapeMovieBiteSchedule(): Promise<MatchData[]> {
  try {
    const response = await fetch(MOVIEBITE_SCHEDULE, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      throw new Error(`MovieBite schedule returned ${response.status}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      throw new Error("Failed to parse HTML");
    }

    const matches: MatchData[] = [];

    // Buscar todos los elementos de partidos en el calendario
    // Adaptar estos selectores según la estructura real del HTML de MovieBite
    const matchElements = doc.querySelectorAll(".match-item, .game-card, .event-card, [data-match-id]");

    matchElements.forEach((element, index) => {
      try {
        // Extraer información del partido
        const titleElement = element.querySelector(".match-title, .game-title, .event-title, h3, h4");
        const title = titleElement?.textContent?.trim() || `Match ${index + 1}`;

        // Extraer equipos
        const homeTeamElement = element.querySelector(".home-team, .team-home, [data-home-team]");
        const awayTeamElement = element.querySelector(".away-team, .team-away, [data-away-team]");
        const homeTeam = homeTeamElement?.textContent?.trim() || "";
        const awayTeam = awayTeamElement?.textContent?.trim() || "";

        // Extraer categoría/deporte
        const categoryElement = element.querySelector(".category, .sport, .league, [data-category]");
        const category = categoryElement?.textContent?.trim() || "Unknown";

        // Extraer hora programada
        const timeElement = element.querySelector(".time, .scheduled-time, [data-time]");
        const scheduledTime = timeElement?.textContent?.trim() || "";

        // Extraer ID del partido
        const matchId =
          element.getAttribute("data-match-id") ||
          element.getAttribute("data-id") ||
          element.getAttribute("id") ||
          `moviebite_${Date.now()}_${index}`;

        // Buscar links de streaming
        const sources: MatchSource[] = [];
        const linkElements = element.querySelectorAll('a[href*="embed"], a[data-source], .stream-link');

        linkElements.forEach((link) => {
          const href = link.getAttribute("href") || "";
          const dataSource = link.getAttribute("data-source") || "";

          // Intentar extraer el tipo de fuente y el ID
          if (href.includes("/admin/")) {
            const adminMatch = href.match(/\/admin\/([^\/]+)/);
            if (adminMatch) {
              sources.push({ source: "admin", id: adminMatch[1] });
            }
          } else if (href.includes("/delta/")) {
            const deltaMatch = href.match(/\/delta\/([^\/]+)/);
            if (deltaMatch) {
              sources.push({ source: "delta", id: deltaMatch[1] });
            }
          } else if (href.includes("/echo/")) {
            const echoMatch = href.match(/\/echo\/([^\/]+)/);
            if (echoMatch) {
              sources.push({ source: "echo", id: echoMatch[1] });
            }
          } else if (href.includes("/golf/")) {
            const golfMatch = href.match(/\/golf\/([^\/]+)/);
            if (golfMatch) {
              sources.push({ source: "golf", id: golfMatch[1] });
            }
          } else if (dataSource) {
            sources.push({ source: dataSource, id: matchId });
          }
        });

        matches.push({
          id: matchId,
          title: title,
          category: category,
          teams: {
            home: { name: homeTeam },
            away: { name: awayTeam },
          },
          sources: sources,
          scheduledTime: scheduledTime,
        });
      } catch (elementError) {
        console.error(`Error processing match element ${index}:`, elementError);
      }
    });

    return matches;
  } catch (error) {
    console.error("Error scraping MovieBite schedule:", error);
    return [];
  }
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

    // Combinar ambas fuentes de datos
    let allMatches: MatchData[] = [];

    // 1. Obtener partidos de la API original
    try {
      const apiResponse = await fetch("https://streamed.pk/api/matches/all", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (apiResponse.ok) {
        const apiMatches: MatchData[] = await apiResponse.json();
        allMatches = [...apiMatches];
      }
    } catch (apiError) {
      console.error("Error fetching from API:", apiError);
    }

    // 2. Obtener partidos del calendario de MovieBite
    try {
      const movieBiteMatches = await scrapeMovieBiteSchedule();
      allMatches = [...allMatches, ...movieBiteMatches];
    } catch (scrapeError) {
      console.error("Error scraping MovieBite:", scrapeError);
    }

    // Process matches
    const records = allMatches.map((match) => {
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
        scheduled_time: match.scheduledTime || null,
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
          api: allMatches.filter((m) => !m.id.startsWith("moviebite_")).length,
          moviebite: allMatches.filter((m) => m.id.startsWith("moviebite_")).length,
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
