import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map league keys to ESPN API sport paths
function leagueToESPNPath(key: string): string {
  const map: Record<string, string> = {
    // Basketball
    nba: "basketball/nba",
    wnba: "basketball/wnba",
    ncaab: "basketball/mens-college-basketball",
    // Football
    nfl: "football/nfl",
    ncaaf: "football/college-football",
    // Hockey
    nhl: "hockey/nhl",
    // Baseball
    mlb: "baseball/mlb",
    // MMA
    ufc: "mma/ufc",
    // Soccer - everything else
  };
  if (map[key]) return map[key];
  // Default: soccer
  return `soccer/${key}`;
}

function teamToSlug(team: string): string {
  return team
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

interface LeagueInfo {
  key: string;
  name: string;
  sport: string;
}

// All leagues to scan
const ALL_LEAGUES: LeagueInfo[] = [
  { key: "nba", name: "NBA", sport: "Basketball" },
  { key: "wnba", name: "WNBA", sport: "Basketball" },
  { key: "nfl", name: "NFL", sport: "Football" },
  { key: "nhl", name: "NHL", sport: "Hockey" },
  { key: "mlb", name: "MLB", sport: "Baseball" },
  { key: "mls", name: "MLS", sport: "Soccer" },
  { key: "ufc", name: "UFC", sport: "MMA" },
  // European Soccer
  { key: "eng.1", name: "Premier League", sport: "Soccer" },
  { key: "esp.1", name: "LaLiga", sport: "Soccer" },
  { key: "ger.1", name: "Bundesliga", sport: "Soccer" },
  { key: "ita.1", name: "Serie A", sport: "Soccer" },
  { key: "fra.1", name: "Ligue 1", sport: "Soccer" },
  { key: "ned.1", name: "Eredivisie", sport: "Soccer" },
  { key: "por.1", name: "Liga Portugal", sport: "Soccer" },
  // UEFA
  { key: "uefa.champions", name: "Champions League", sport: "Soccer" },
  { key: "uefa.europa", name: "Europa League", sport: "Soccer" },
  { key: "uefa.conference", name: "Conference League", sport: "Soccer" },
  // Americas
  { key: "mex.1", name: "Liga MX", sport: "Soccer" },
  { key: "arg.1", name: "Liga Argentina", sport: "Soccer" },
  { key: "bra.1", name: "Brasileirão", sport: "Soccer" },
  { key: "col.1", name: "Liga Colombiana", sport: "Soccer" },
  { key: "conmebol.libertadores", name: "Copa Libertadores", sport: "Soccer" },
  { key: "conmebol.sudamericana", name: "Copa Sudamericana", sport: "Soccer" },
  { key: "concacaf.champions", name: "Concacaf Champions Cup", sport: "Soccer" },
  // Cups
  { key: "eng.fa", name: "FA Cup", sport: "Soccer" },
  { key: "esp.copa_del_rey", name: "Copa del Rey", sport: "Soccer" },
  { key: "ita.coppa_italia", name: "Coppa Italia", sport: "Soccer" },
  { key: "ger.dfb_pokal", name: "DFB-Pokal", sport: "Soccer" },
  { key: "fra.coupe_de_france", name: "Coupe de France", sport: "Soccer" },
  // Asian
  { key: "sau.1", name: "Saudi Pro League", sport: "Soccer" },
  { key: "jpn.1", name: "J1 League", sport: "Soccer" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    // Get existing events by espn_id to avoid duplicates
    const { data: existingEvents } = await supabase
      .from("events")
      .select("espn_id")
      .eq("is_active", true)
      .not("espn_id", "is", null);

    const existingEspnIds = new Set(
      (existingEvents || []).map((e: { espn_id: string | null }) => e.espn_id)
    );

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    let totalAssigned = 0;
    const assignedEvents: string[] = [];
    const errors: string[] = [];

    // Process leagues in batches of 5 to avoid rate limiting
    for (let i = 0; i < ALL_LEAGUES.length; i += 5) {
      const batch = ALL_LEAGUES.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (league) => {
          try {
            const espnPath = leagueToESPNPath(league.key);
            const url = `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard?dates=${dateStr}`;
            const res = await fetch(url);
            if (!res.ok) return [];

            const data = await res.json();
            const events = data.events || [];
            const toInsert: Array<Record<string, unknown>> = [];

            for (const event of events) {
              // Skip if already exists
              if (existingEspnIds.has(event.id)) continue;

              const eventDate = new Date(event.date);
              const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);

              // Only events starting within 30 minutes (or already live)
              const comp = event.competitions?.[0];
              const isLive = comp?.status?.type?.state === "in";
              const startsWithin30 = minutesUntilStart >= -10 && minutesUntilStart <= 30;

              if (!startsWithin30 && !isLive) continue;

              const competitors = comp?.competitors || [];
              const home = competitors.find((c: { homeAway: string }) => c.homeAway === "home");
              const away = competitors.find((c: { homeAway: string }) => c.homeAway === "away");

              if (!home?.team?.displayName || !away?.team?.displayName) continue;

              const homeSlug = teamToSlug(home.team.displayName);
              const awaySlug = teamToSlug(away.team.displayName);
              const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

              toInsert.push({
                espn_id: event.id,
                name: `${home.team.displayName} vs ${away.team.displayName}`,
                event_date: event.date,
                sport: league.sport,
                league: league.name,
                team_home: home.team.displayName,
                team_away: away.team.displayName,
                thumbnail: home.team.logo || null,
                stream_url: `https://embedsports.top/embed/admin/${matchSlug}/1?autoplay=1`,
                stream_url_2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
                stream_url_3: `https://embedsports.top/embed/echo/${matchSlug}/1`,
                is_live: isLive,
                is_active: true,
              });
            }

            if (toInsert.length > 0) {
              const { error } = await supabase
                .from("events")
                .upsert(toInsert, { onConflict: "espn_id" });

              if (error) {
                errors.push(`${league.name}: ${error.message}`);
              } else {
                totalAssigned += toInsert.length;
                toInsert.forEach((e) => assignedEvents.push(e.name as string));
                // Track inserted IDs to avoid re-processing
                toInsert.forEach((e) => existingEspnIds.add(e.espn_id as string));
              }
            }

            return toInsert;
          } catch (err) {
            errors.push(`${league.name}: ${err instanceof Error ? err.message : "unknown"}`);
            return [];
          }
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalAssigned,
        assignedEvents,
        leaguesScanned: ALL_LEAGUES.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error auto-assigning links:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
