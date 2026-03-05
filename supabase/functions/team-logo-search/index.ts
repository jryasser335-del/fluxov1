import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const cache = new Map<string, { logo: string | null; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Try ESPN's global search API first (fast, single request)
async function searchESPN(teamName: string): Promise<string | null> {
  try {
    // ESPN site search for teams
    const res = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(teamName)}&limit=10&type=team&mode=prefix`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    const results = data?.results || [];
    const q = normalize(teamName);
    
    for (const item of results) {
      const name = normalize(item?.displayName || item?.name || "");
      const shortName = normalize(item?.shortName || "");
      
      if (name === q || name.includes(q) || q.includes(name) || shortName === q) {
        // Try to get logo from the result
        if (item?.logo?.href) return item.logo.href;
        if (item?.logos?.[0]?.href) return item.logos[0].href;
        
        // If we have a team ID and sport, construct ESPN CDN URL
        const id = item?.id;
        const sport = item?.sport?.slug;
        if (id && sport) {
          const sportMap: Record<string, string> = {
            soccer: "soccer", basketball: "nba", baseball: "mlb",
            hockey: "nhl", football: "nfl", "mixed-martial-arts": "mma",
          };
          const segment = sportMap[sport] || sport;
          return `https://a.espncdn.com/i/teamlogos/${segment}/500/${id}.png`;
        }
      }
    }
    
    // Also check content items
    const content = data?.content || [];
    for (const section of content) {
      const items = section?.items || [];
      for (const item of items) {
        if (item?.type === "team") {
          const name = normalize(item?.displayName || "");
          if (name.includes(q) || q.includes(name)) {
            if (item?.logo?.href) return item.logo.href;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// Fallback: ESPN scoreboard APIs for specific sports
async function searchESPNScoreboard(teamName: string): Promise<string | null> {
  const q = normalize(teamName);
  const sports = [
    "soccer/eng.1", "soccer/esp.1", "soccer/ger.1", "soccer/ita.1", "soccer/fra.1",
    "soccer/uefa.champions", "soccer/uefa.europa", "soccer/mex.1", "soccer/bra.1",
    "soccer/arg.1", "soccer/ned.1", "soccer/por.1", "soccer/usa.1",
    "basketball/nba", "basketball/wnba",
    "baseball/mlb", "hockey/nhl", "football/nfl",
  ];
  for (const sport of sports) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${sport}/scoreboard`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const ev of data?.events || []) {
        for (const comp of ev?.competitions || []) {
          for (const c of comp?.competitors || []) {
            const t = c?.team;
            if (!t) continue;
            const name = normalize(t.displayName || "");
            const short = normalize(t.shortDisplayName || "");
            const abbr = normalize(t.abbreviation || "");
            if (name === q || name.includes(q) || q.includes(name) || short === q || abbr === q) {
              return t.logo || (t.logos?.[0]?.href) || null;
            }
          }
        }
      }
    } catch { /* skip */ }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const teamName = url.searchParams.get("t");

    if (!teamName) {
      return new Response(JSON.stringify({ logo: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = normalize(teamName);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify({ logo: cached.logo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
      });
    }

    // Try ESPN search first, then ESPN scoreboard as fallback
    let logo = await searchESPN(teamName);
    if (!logo) {
      logo = await searchESPNScoreboard(teamName);
    }

    cache.set(cacheKey, { logo, ts: Date.now() });

    return new Response(JSON.stringify({ logo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ logo: null, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
